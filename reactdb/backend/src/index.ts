import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { initializeDatabase, closeDatabase, getPool } from './database';
import sql from 'mssql';

const app: Express = express();
const PORT: number = parseInt(process.env.EXPRESS_PORT || '5000');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.get('/api/database/status', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query('SELECT 1 as connected');
    res.json({ status: 'connected', message: 'Database connection successful' });
  } catch (error) {
    console.error('Database query error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database query failed',
      details: errorMessage
    });
  }
});

// Example API endpoint - Get all tables
app.get('/api/tables', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool
      .request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get tables error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve tables',
      details: errorMessage
    });
  }
});

// Diagnostic endpoint - Check RentalCollection table structure
app.get('/api/diagnostic/rental-schema', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool
      .request()
      .query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'RentalCollection'
        ORDER BY ORDINAL_POSITION
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Schema check error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve schema',
      details: errorMessage
    });
  }
});

// Diagnostic endpoint - Check sample data
app.get('/api/diagnostic/rental-sample', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool
      .request()
      .query(`SELECT TOP 5 * FROM RentalCollection`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Sample data error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve sample data',
      details: errorMessage
    });
  }
});

// Rental Collection endpoints
app.get('/api/rental/summary', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        CONVERT(VARCHAR(7), RentReceivedOn, 120) as month,
        COUNT(DISTINCT OccupancyId) as total_occupancies,
        COUNT(*) as total_records,
        ISNULL(SUM(CAST(RentReceived AS FLOAT)), 0) as total_collected,
        ISNULL(SUM(CAST(RentBalance AS FLOAT)), 0) as total_outstanding
      FROM RentalCollection
      WHERE RentReceivedOn IS NOT NULL
      GROUP BY CONVERT(VARCHAR(7), RentReceivedOn, 120)
      ORDER BY month DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Rental summary error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve rental summary',
      details: errorMessage
    });
  }
});

app.get('/api/rental/unpaid-tenants', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        CONVERT(VARCHAR(7), RentReceivedOn, 120) as month,
        COUNT(DISTINCT OccupancyId) as outstanding_count,
        ISNULL(SUM(CAST(RentBalance AS FLOAT)), 0) as total_outstanding
      FROM RentalCollection
      WHERE RentBalance > 0 AND RentReceivedOn IS NOT NULL
      GROUP BY CONVERT(VARCHAR(7), RentReceivedOn, 120)
      ORDER BY month DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Unpaid tenants error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve unpaid tenants',
      details: errorMessage
    });
  }
});

app.get('/api/rental/unpaid-details/:month', async (req: Request, res: Response) => {
  try {
    const { month } = req.params;
    
    const pool = getPool();
    const result = await pool
      .request()
      .input('month', sql.VarChar(7), month)
      .query(`
        SELECT 
          OccupancyId,
          ISNULL(SUM(CAST(RentBalance AS FLOAT)), 0) as pending_amount,
          ISNULL(SUM(CAST(RentReceived AS FLOAT)), 0) as collected_amount,
          COUNT(*) as records_count,
          MAX(RentReceivedOn) as latest_date
        FROM RentalCollection
        WHERE RentBalance > 0
          AND CONVERT(VARCHAR(7), RentReceivedOn, 120) = @month
        GROUP BY OccupancyId
        ORDER BY SUM(CAST(RentBalance AS FLOAT)) DESC
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Unpaid details error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve unpaid details',
      details: errorMessage
    });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Express server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await closeDatabase();
  process.exit(0);
});

startServer();
