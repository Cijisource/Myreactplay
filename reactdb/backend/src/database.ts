import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'gnanabi.database.windows.net',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_DATABASE || 'mansion',
  user: process.env.DB_USER || 'servergnanaabi',
  password: process.env.DB_PASSWORD || 'serverpassword@123',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
};

let pool: sql.ConnectionPool;
const queryCache = new Map<string, { expiresAt: number; result: Promise<sql.IResult<any>> }>();
const queryCacheTtlMs = Math.max(0, Number.parseInt(process.env.DB_CACHE_TTL_MS || '30000', 10) || 0);
const configuredRetryAttempts = Number.parseInt(process.env.DB_RETRY_ATTEMPTS || '3', 10);
const databaseRetryAttempts = Number.isFinite(configuredRetryAttempts)
  ? Math.min(5, Math.max(0, configuredRetryAttempts))
  : 3;
const configuredRetryBaseDelayMs = Number.parseInt(process.env.DB_RETRY_BASE_DELAY_MS || '250', 10);
const databaseRetryBaseDelayMs = Number.isFinite(configuredRetryBaseDelayMs)
  ? Math.min(5000, Math.max(0, configuredRetryBaseDelayMs))
  : 250;
const transientDatabaseErrorCodes = new Set([
  'ECONNCLOSED', 'ENOTOPEN', 'ESOCKET', 'ECONNRESET', 'ECONNREFUSED',
  'ETIMEDOUT', 'EPIPE', 'EHOSTUNREACH', 'EAI_AGAIN',
]);
const transientDatabaseErrorNumbers = new Set([
  1205, 40197, 40501, 40613, 10928, 10929, 49918, 49919, 49920,
]);
let queryCacheGeneration = 0;

const isTransientDatabaseError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const databaseError = error as {
    code?: unknown;
    number?: unknown;
    originalError?: { code?: unknown; number?: unknown; info?: { number?: unknown } };
  };
  const errorCode = String(databaseError.code || databaseError.originalError?.code || '').toUpperCase();
  const errorNumber = Number(
    databaseError.number ?? databaseError.originalError?.number ?? databaseError.originalError?.info?.number
  );

  return transientDatabaseErrorCodes.has(errorCode) || transientDatabaseErrorNumbers.has(errorNumber);
};

const retryDatabaseOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= databaseRetryAttempts || !isTransientDatabaseError(error)) {
        throw error;
      }

      const delayMs = Math.min(databaseRetryBaseDelayMs * (2 ** attempt), 5000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const invalidateQueryCache = (): void => {
  queryCacheGeneration += 1;
  queryCache.clear();
};

const cacheableSelect = (query: unknown): query is string => {
  if (typeof query !== 'string' || /;\s*\S/.test(query) || /\bINTO\b/i.test(query)) {
    return false;
  }

  if (/^\s*SELECT\b/i.test(query)) {
    return true;
  }

  return /^\s*WITH\b/i.test(query) &&
    /\bSELECT\b/i.test(query) &&
    !/\b(?:INSERT|UPDATE|DELETE|MERGE)\b/i.test(query);
};

const getRequestCacheKey = (request: sql.Request, query: string): string | null => {
  try {
    const parameters = Object.entries(request.parameters)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([name, parameter]) => [name, parameter.value]);
    return `${query}\n${JSON.stringify(parameters)}`;
  } catch {
    return null;
  }
};

const createCachedPool = (connectionPool: sql.ConnectionPool): sql.ConnectionPool => new Proxy(connectionPool, {
  get(target, property, receiver) {
    if (property !== 'request') {
      return Reflect.get(target, property, receiver);
    }

    return (...args: unknown[]) => {
      const request = Reflect.apply(target.request, target, args) as sql.Request;
      let requestProxy: sql.Request;

      requestProxy = new Proxy(request, {
        get(requestTarget, requestProperty, requestReceiver) {
          if (requestProperty === 'query') {
            return (...queryArgs: unknown[]) => {
              const query = queryArgs[0];
              if (!cacheableSelect(query) || queryCacheTtlMs === 0) {
                invalidateQueryCache();
                return retryDatabaseOperation(() =>
                  Reflect.apply(requestTarget.query, requestTarget, queryArgs) as Promise<unknown>
                );
              }

              const cacheKey = getRequestCacheKey(requestTarget, query);
              if (cacheKey === null) {
                return retryDatabaseOperation(() =>
                  Reflect.apply(requestTarget.query, requestTarget, queryArgs) as Promise<unknown>
                );
              }

              const cached = queryCache.get(cacheKey);
              if (cached && cached.expiresAt > Date.now()) {
                return cached.result;
              }

              const generation = queryCacheGeneration;
              const result = retryDatabaseOperation(() =>
                Reflect.apply(requestTarget.query, requestTarget, queryArgs) as Promise<sql.IResult<any>>
              );
              const cachedResult = result.then((queryResult) => {
                if (generation === queryCacheGeneration) {
                  if (queryCache.size >= 1000) {
                    queryCache.clear();
                  }
                  queryCache.set(cacheKey, {
                    expiresAt: Date.now() + queryCacheTtlMs,
                    result: Promise.resolve(queryResult),
                  });
                }
                return queryResult;
              }).catch((error) => {
                if (queryCache.get(cacheKey)?.result === cachedResult) {
                  queryCache.delete(cacheKey);
                }
                throw error;
              });

              queryCache.set(cacheKey, {
                expiresAt: Date.now() + queryCacheTtlMs,
                result: cachedResult,
              });
              return cachedResult;
            };
          }

          if (requestProperty === 'execute' || requestProperty === 'batch') {
            return (...operationArgs: unknown[]) => {
              invalidateQueryCache();
              const operation = Reflect.get(requestTarget, requestProperty, requestTarget);
              return retryDatabaseOperation(() =>
                Reflect.apply(operation, requestTarget, operationArgs) as Promise<unknown>
              );
            };
          }

          const value = Reflect.get(requestTarget, requestProperty, requestTarget);
          if (typeof value === 'function') {
            return (...methodArgs: unknown[]) => {
              const result = Reflect.apply(value, requestTarget, methodArgs);
              return result === requestTarget ? requestReceiver : result;
            };
          }
          return value;
        },
      }) as sql.Request;

      return requestProxy;
    };
  },
});

export async function initializeDatabase(): Promise<void> {
  try {
    console.log(`Connecting to Azure SQL Server...`);
    console.log(`Server: ${config.server}, Database: ${config.database}`);
    
    pool = new sql.ConnectionPool(config);
    await retryDatabaseOperation(() => pool.connect());
    console.log('Database connected');
  } catch (error) {
    console.error('✗ Failed to connect to database:', error);
    console.error('Connection config:', {
      server: config.server,
      database: config.database,
      port: config.port,
      user: config.user,
      options: config.options
    });
    throw error;
  }
}

export function getPool(): sql.ConnectionPool {
  if (!pool) {
    throw new Error('Database connection pool not initialized');
  }
  return createCachedPool(pool);
}

export function getDatabaseConnectionInfo() {
  return {
    server: config.server,
    port: config.port,
    database: config.database,
    user: config.user,
    connectionString: `Server=${config.server},${config.port};Database=${config.database};User Id=${config.user};Password=********;Encrypt=true;`,
  };
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.close();
    console.log('✓ Database connection closed');
  }
}
