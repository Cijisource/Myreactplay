import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initializeDatabase, closeDatabase, getPool } from './database';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app: Express = express();
const PORT: number = parseInt(process.env.EXPRESS_PORT || '5000');

// Determine complains directory based on environment
// In Docker: /app/complains (or use env variable if provided)
// In local development: process.cwd()/complains
const isDocker = process.env.NODE_ENV === 'production';
const complainsDir = process.env.COMPLAINS_DIR || 
  (isDocker ? '/app/complains' : path.resolve(process.cwd(), 'complains'));

// Determine daily status media directory
const dailyStatusMediaDir = process.env.DAILY_STATUS_MEDIA_DIR || 
  (isDocker ? '/app/daily-status-media' : path.resolve(process.cwd(), 'daily-status-media'));

console.log('Environment:', { NODE_ENV: process.env.NODE_ENV, isDocker });
console.log('Complains directory:', complainsDir);
console.log('Daily Status Media directory:', dailyStatusMediaDir);

if (!fs.existsSync(complainsDir)) {
  fs.mkdirSync(complainsDir, { recursive: true });
  console.log('Created complains directory:', complainsDir);
} else {
  console.log('Complains directory already exists');
}

if (!fs.existsSync(dailyStatusMediaDir)) {
  fs.mkdirSync(dailyStatusMediaDir, { recursive: true });
  console.log('Created daily status media directory:', dailyStatusMediaDir);
} else {
  console.log('Daily status media directory already exists');
}

// Verify directories are readable/writable
try {
  fs.accessSync(complainsDir, fs.constants.R_OK | fs.constants.W_OK);
  console.log('Complains directory is readable and writable');
} catch (err) {
  console.error('ERROR: Complains directory is not accessible:', err);
}

try {
  fs.accessSync(dailyStatusMediaDir, fs.constants.R_OK | fs.constants.W_OK);
  console.log('Daily status media directory is readable and writable');
} catch (err) {
  console.error('ERROR: Daily status media directory is not accessible:', err);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, complainsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for daily status media uploads
const dailyStatusMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dailyStatusMediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

const uploadDailyStatusMedia = multer({
  storage: dailyStatusMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
// Serve static files from complains folder via API path and direct path
app.use('/api/complains', express.static(complainsDir));
app.use('/complains', express.static(complainsDir));
console.log('Static file serving enabled at /api/complains and /complains from:', complainsDir);

// Serve static files from daily status media folder
app.use('/api/daily-status-media', express.static(dailyStatusMediaDir));
app.use('/daily-status-media', express.static(dailyStatusMediaDir));
console.log('Static file serving enabled at /api/daily-status-media and /daily-status-media from:', dailyStatusMediaDir);

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Test endpoint to check upload directory
app.get('/api/complaints/test-upload', (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(complainsDir);
    const stats = fs.statSync(complainsDir);
    const fileDetails = files.map(f => {
      const filePath = path.join(complainsDir, f);
      const fileStats = fs.statSync(filePath);
      return {
        name: f,
        size: fileStats.size,
        mode: '0o' + fileStats.mode.toString(8).slice(-3),
        accessible: true
      };
    });
    
    res.json({
      uploadDirectory: complainsDir,
      directoryExists: fs.existsSync(complainsDir),
      directoryMode: '0o' + stats.mode.toString(8).slice(-3),
      directorySize: stats.size,
      filesInDirectory: files,
      fileDetails: fileDetails,
      totalFiles: files.length,
      servingAt: ['/api/complains', '/complains']
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: 'Failed to read upload directory',
      details: errorMessage,
      uploadDirectory: complainsDir
    });
  }
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

// Authentication endpoint
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    const pool = getPool();
    
    // Query user from database
    const userResult = await pool.request()
      .input('username', sql.NVarChar(100), username)
      .query(`
        SELECT 
          Id as id,
          UserName as username,
          Password as password,
          Name as name
        FROM [User]
        WHERE UserName = @username
      `);

    if (!userResult.recordset.length) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    const user = userResult.recordset[0];

    // Check password (in production, should use hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    // Get user roles
    const rolesResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query(`
        SELECT 
          r.RoleName as roleName,
          r.RoleType as roleType
        FROM UserRole ur
        LEFT JOIN RoleDetail r ON ur.RoleId = r.Id
        WHERE ur.UserId = @userId
      `);

    const roles = rolesResult.recordset.map(r => r.roleName).join(',') || 'user';

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        name: user.name,
        roles: roles
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Return token and user info
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        roles: roles
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Login failed',
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

// Get payment details by month and year
app.get('/api/rental/payments/:monthYear', async (req: Request, res: Response) => {
  try {
    const { monthYear } = req.params;
    
    // Parse monthYear in format YYYY-MM
    const [year, month] = monthYear.split('-').map(Number);
    
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ 
        error: 'Invalid month-year format. Use YYYY-MM' 
      });
    }
    
    const pool = getPool();
    const result = await pool
      .request()
      .input('year', sql.Int, year)
      .input('month', sql.Int, month)
      .query(`
        SELECT 
          o.Id as occupancyId,
          t.Id as tenantId,
          t.Name as tenantName,
          rd.Number as roomNumber,
          ISNULL(o.RentFixed, rd.Rent) as rentFixed,
          ISNULL(CAST(rc.RentReceivedOn AS NVARCHAR), NULL) as rentReceivedOn,
          ISNULL(CAST(rc.RentReceived AS FLOAT), 0) as rentReceived,
          ISNULL(CAST(o.RentFixed AS FLOAT), CAST(rd.Rent AS FLOAT)) - ISNULL(CAST(rc.RentReceived AS FLOAT), 0) as rentBalance,
          @month as [month],
          @year as [year],
          CASE 
            WHEN rc.Id IS NULL THEN 'pending'
            WHEN ISNULL(CAST(rc.RentBalance AS FLOAT), 0) = 0 THEN 'paid'
            WHEN ISNULL(CAST(rc.RentReceived AS FLOAT), 0) > 0 THEN 'partial'
            ELSE 'pending'
          END as paymentStatus
        FROM Occupancy o
        INNER JOIN Tenant t ON o.TenantId = t.Id
        INNER JOIN RoomDetail rd ON o.RoomId = rd.Id
        LEFT JOIN RentalCollection rc ON rc.OccupancyId = o.Id
          AND YEAR(CAST(rc.RentReceivedOn AS DATE)) = @year
          AND MONTH(CAST(rc.RentReceivedOn AS DATE)) = @month
        WHERE 
          -- Occupancy is active during this month
          CAST(o.CheckInDate AS DATE) <= EOMONTH(DATEFROMPARTS(@year, @month, 1))
          AND (o.CheckOutDate IS NULL OR CAST(o.CheckOutDate AS DATE) > DATEFROMPARTS(@year, @month, 1))
        ORDER BY t.Name ASC
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Payment details error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve payment details',
      details: errorMessage
    });
  }
});

// Room Occupancy Endpoint

// Get occupancy records with explicit room-tenant linking (via FK_Occupancy_Tenant)
app.get('/api/occupancy/links', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        o.Id as occupancyId,
        t.Id as tenantId,
        t.Name as tenantName,
        t.Phone as tenantPhone,
        t.Address as tenantAddress,
        t.City as tenantCity,
        t.PhotoUrl as tenantPhoto,
        rd.Id as roomId,
        rd.Number as roomNumber,
        ISNULL(CAST(rd.Rent AS FLOAT), 0) as roomRent,
        rd.Beds as beds,
        o.CheckInDate as checkInDate,
        o.CheckOutDate as checkOutDate,
        ISNULL(CAST(o.RentFixed AS FLOAT), 0) as rentFixed,
        CASE WHEN o.CheckOutDate > CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END as isActive,
        ISNULL(CAST(COALESCE(
          (SELECT TOP 1 CAST(RentReceived AS FLOAT) 
           FROM RentalCollection 
           WHERE OccupancyId = o.Id 
           AND YEAR(RentReceivedOn) = YEAR(GETDATE())
           AND MONTH(RentReceivedOn) = MONTH(GETDATE())
           ORDER BY RentReceivedOn DESC),
          0) AS FLOAT), 0) as currentRentReceived,
        ISNULL(CAST(COALESCE(
          (SELECT TOP 1 CAST(RentBalance AS FLOAT) 
           FROM RentalCollection 
           WHERE OccupancyId = o.Id 
           AND YEAR(RentReceivedOn) = YEAR(GETDATE())
           AND MONTH(RentReceivedOn) = MONTH(GETDATE())
           ORDER BY RentReceivedOn DESC),
          0) AS FLOAT), 0) as currentPendingPayment,
        ISNULL(CAST(COALESCE(
          (SELECT TOP 1 RentReceivedOn 
           FROM RentalCollection 
           WHERE OccupancyId = o.Id 
           AND YEAR(RentReceivedOn) = YEAR(GETDATE())
           AND MONTH(RentReceivedOn) = MONTH(GETDATE())
           ORDER BY RentReceivedOn DESC), NULL) AS NVARCHAR(10)), NULL) as lastPaymentDate
      FROM Occupancy o
      INNER JOIN Tenant t ON o.TenantId = t.Id
      INNER JOIN RoomDetail rd ON o.RoomId = rd.Id
      ORDER BY o.CheckOutDate ASC, t.Name ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Occupancy links error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve occupancy links',
      details: errorMessage
    });
  }
});

// Get all rooms with occupancy and payment data
app.get('/api/rooms/occupancy', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        rd.Id as roomId,
        rd.Number as roomNumber,
        ISNULL(CAST(rd.Rent AS FLOAT), 0) as roomRent,
        ISNULL(rd.Beds, 0) as beds,
        CASE WHEN o.Id IS NOT NULL AND o.CheckOutDate > CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END as isOccupied,
        o.TenantId as tenantId,
        t.Name as tenantName,
        t.Phone as tenantPhone,
        o.CheckInDate as checkInDate,
        o.CheckOutDate as checkOutDate,
        ISNULL(CAST(COALESCE(
          (SELECT TOP 1 CAST(RentReceived AS FLOAT) 
           FROM RentalCollection 
           WHERE OccupancyId = o.Id 
           AND YEAR(RentReceivedOn) = YEAR(GETDATE())
           AND MONTH(RentReceivedOn) = MONTH(GETDATE())
           ORDER BY RentReceivedOn DESC),
          0) AS FLOAT), 0) as currentRentReceived,
        ISNULL(CAST(COALESCE(
          (SELECT TOP 1 CAST(RentBalance AS FLOAT) 
           FROM RentalCollection 
           WHERE OccupancyId = o.Id 
           AND YEAR(RentReceivedOn) = YEAR(GETDATE())
           AND MONTH(RentReceivedOn) = MONTH(GETDATE())
           ORDER BY RentReceivedOn DESC),
          0) AS FLOAT), 0) as currentPendingPayment,
        ISNULL(CAST(COALESCE(
          (SELECT TOP 1 RentReceivedOn 
           FROM RentalCollection 
           WHERE OccupancyId = o.Id 
           AND YEAR(RentReceivedOn) = YEAR(GETDATE())
           AND MONTH(RentReceivedOn) = MONTH(GETDATE())
           ORDER BY RentReceivedOn DESC), NULL) AS NVARCHAR(10)), NULL) as lastPaymentDate
      FROM RoomDetail rd
      LEFT JOIN Occupancy o ON rd.Id = o.RoomId AND o.CheckOutDate > CAST(GETDATE() AS DATE)
      LEFT JOIN Tenant t ON o.TenantId = t.Id
      ORDER BY rd.Number ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Room occupancy error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve room occupancy data',
      details: errorMessage
    });
  }
});

// Tenant Management Endpoints

// Get all tenants with occupancy details and pending payments
app.get('/api/tenants/with-occupancy', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        t.Id as id,
        TRIM(t.Name) as name,
        TRIM(t.Phone) as phone,
        TRIM(t.Address) as address,
        TRIM(t.City) as city,
        t.PhotoUrl as photoUrl,
        t.Proof1Url as proof1Url,
        t.Proof2Url as proof2Url,
        t.Proof3Url as proof3Url,
        o.Id as occupancyId,
        rd.Number as roomNumber,
        rd.Id as roomId,
        o.CheckInDate as checkInDate,
        o.CheckOutDate as checkOutDate,
        ISNULL(o.RentFixed, rd.Rent) as rentFixed,
        CASE WHEN o.CheckOutDate > CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END as isCurrentlyOccupied,
        ISNULL(CAST(COALESCE(
          (SELECT TOP 1 CAST(RentBalance AS FLOAT) 
           FROM RentalCollection 
           WHERE OccupancyId = o.Id 
           AND YEAR(RentReceivedOn) = YEAR(GETDATE())
           AND MONTH(RentReceivedOn) = MONTH(GETDATE())
           ORDER BY RentReceivedOn DESC),
          0) AS FLOAT), 0) as currentPendingPayment,
        ISNULL(CAST(COALESCE(
          (SELECT TOP 1 CAST(RentReceived AS FLOAT) 
           FROM RentalCollection 
           WHERE OccupancyId = o.Id 
           AND YEAR(RentReceivedOn) = YEAR(GETDATE())
           AND MONTH(RentReceivedOn) = MONTH(GETDATE())
           ORDER BY RentReceivedOn DESC),
          0) AS FLOAT), 0) as currentRentReceived,
        ISNULL(CAST(COALESCE(
          (SELECT TOP 1 RentReceivedOn 
           FROM RentalCollection 
           WHERE OccupancyId = o.Id 
           AND YEAR(RentReceivedOn) = YEAR(GETDATE())
           AND MONTH(RentReceivedOn) = MONTH(GETDATE())
           ORDER BY RentReceivedOn DESC), NULL) AS NVARCHAR(10)), NULL) as lastPaymentDate
      FROM Tenant t
      LEFT JOIN Occupancy o ON t.Id = o.TenantId AND o.CheckOutDate > CAST(GETDATE() AS DATE)
      LEFT JOIN RoomDetail rd ON o.RoomId = rd.Id
      ORDER BY t.Name ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get tenants error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve tenants',
      details: errorMessage
    });
  }
});

// Get single tenant
app.get('/api/tenants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT 
          t.Id as id,
          TRIM(t.Name) as name,
          TRIM(t.Phone) as phone,
          TRIM(t.Address) as address,
          TRIM(t.City) as city,
          t.PhotoUrl,
          t.Proof1Url,
          t.Proof2Url,
          t.Proof3Url,
          o.Id as occupancyId,
          rd.Number as roomNumber,
          o.CheckInDate,
          o.CheckOutDate,
          o.RentFixed
        FROM Tenant t
        LEFT JOIN Occupancy o ON t.Id = o.TenantId AND o.CheckOutDate IS NULL
        LEFT JOIN RoomDetail rd ON o.RoomId = rd.Id
        WHERE t.Id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get tenant error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve tenant',
      details: errorMessage
    });
  }
});

// Create tenant
app.post('/api/tenants', async (req: Request, res: Response) => {
  try {
    const { name, phone, address, city, photoUrl, proof1Url, proof2Url, proof3Url } = req.body;
    
    if (!name || !phone || !address || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pool = getPool();
    const result = await pool
      .request()
      .input('name', sql.NChar(100), name)
      .input('phone', sql.NChar(15), phone)
      .input('address', sql.NChar(100), address)
      .input('city', sql.NChar(50), city)
      .input('photoUrl', sql.NVarChar(sql.MAX), photoUrl || null)
      .input('proof1Url', sql.NVarChar(sql.MAX), proof1Url || null)
      .input('proof2Url', sql.NVarChar(sql.MAX), proof2Url || null)
      .input('proof3Url', sql.NVarChar(sql.MAX), proof3Url || null)
      .query(`
        INSERT INTO Tenant (Name, Phone, Address, City, PhotoUrl, Proof1Url, Proof2Url, Proof3Url)
        VALUES (@name, @phone, @address, @city, @photoUrl, @proof1Url, @proof2Url, @proof3Url);
        SELECT SCOPE_IDENTITY() as id;
      `);
    
    const tenantId = result.recordset[0].id;
    res.status(201).json({ id: tenantId, message: 'Tenant created successfully' });
  } catch (error) {
    console.error('Create tenant error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to create tenant',
      details: errorMessage
    });
  }
});

// Update tenant
app.put('/api/tenants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, address, city, photoUrl, proof1Url, proof2Url, proof3Url } = req.body;
    
    if (!name || !phone || !address || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pool = getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .input('name', sql.NChar(100), name)
      .input('phone', sql.NChar(15), phone)
      .input('address', sql.NChar(100), address)
      .input('city', sql.NChar(50), city)
      .input('photoUrl', sql.NVarChar(sql.MAX), photoUrl || null)
      .input('proof1Url', sql.NVarChar(sql.MAX), proof1Url || null)
      .input('proof2Url', sql.NVarChar(sql.MAX), proof2Url || null)
      .input('proof3Url', sql.NVarChar(sql.MAX), proof3Url || null)
      .query(`
        UPDATE Tenant 
        SET Name = @name, Phone = @phone, Address = @address, City = @city,
            PhotoUrl = @photoUrl, Proof1Url = @proof1Url, Proof2Url = @proof2Url, Proof3Url = @proof3Url
        WHERE Id = @id
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('Update tenant error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to update tenant',
      details: errorMessage
    });
  }
});

// Delete tenant
app.delete('/api/tenants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // First check if tenant has active occupancy
    const checkResult = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT COUNT(*) as count FROM Occupancy 
        WHERE TenantId = @id AND CheckOutDate IS NULL
      `);
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete tenant with active occupancy. Check out the tenant first.' 
      });
    }
    
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .query(`DELETE FROM Tenant WHERE Id = @id`);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to delete tenant',
      details: errorMessage
    });
  }
});

// Search tenants
app.get('/api/tenants/search', async (req: Request, res: Response) => {
  try {
    const { field, query } = req.query;
    
    if (!field || !query) {
      return res.status(400).json({ error: 'Missing field or query parameter' });
    }
    
    const pool = getPool();
    const searchQuery = `%${query}%`;
    
    let sqlQuery = '';
    switch (field) {
      case 'name':
        sqlQuery = 'WHERE TRIM(t.Name) LIKE @query';
        break;
      case 'phone':
        sqlQuery = 'WHERE TRIM(t.Phone) LIKE @query';
        break;
      case 'city':
        sqlQuery = 'WHERE TRIM(t.City) LIKE @query';
        break;
      case 'address':
        sqlQuery = 'WHERE TRIM(t.Address) LIKE @query';
        break;
      default:
        return res.status(400).json({ error: 'Invalid search field' });
    }
    
    const result = await pool
      .request()
      .input('query', sql.NVarChar(sql.MAX), searchQuery)
      .query(`
        SELECT 
          t.Id as id,
          TRIM(t.Name) as name,
          TRIM(t.Phone) as phone,
          TRIM(t.Address) as address,
          TRIM(t.City) as city,
          t.PhotoUrl,
          t.Proof1Url,
          t.Proof2Url,
          t.Proof3Url,
          o.Id as occupancyId,
          rd.Number as roomNumber,
          o.CheckInDate,
          o.CheckOutDate,
          o.RentFixed,
          CASE WHEN o.CheckOutDate IS NULL THEN 1 ELSE 0 END as isCurrentlyOccupied
        FROM Tenant t
        LEFT JOIN Occupancy o ON t.Id = o.TenantId AND o.CheckOutDate IS NULL
        LEFT JOIN RoomDetail rd ON o.RoomId = rd.Id
        ${sqlQuery}
        ORDER BY t.Name ASC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Search tenants error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to search tenants',
      details: errorMessage
    });
  }
});

// Complaints Management Endpoints

// Get all complaints with related data
app.get('/api/complaints', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        c.Id as id,
        c.Description as description,
        c.ComplaintTypeId as complaintTypeId,
        ct.Type as complaintTypeName,
        c.ComplaintStatusId as complaintStatusId,
        cs.Status as complaintStatusName,
        c.ClosedDate as closedDate,
        c.ClosureComments as closureComments,
        c.CreatedDate as createdDate,
        c.UpdatedDate as updatedDate,
        c.RoomId as roomId,
        rd.Number as roomNumber,
        ISNULL(CAST(c.Charges AS FLOAT), 0) as charges,
        c.ChargesDetails as chargesDetails,
        c.Proof1Url as proof1Url,
        c.Proof2Url as proof2Url,
        c.VideoUrl as videoUrl
      FROM Complains c
      INNER JOIN ComplainType ct ON c.ComplaintTypeId = ct.Id
      INNER JOIN ComplaintStatus cs ON c.ComplaintStatusId = cs.Id
      INNER JOIN RoomDetail rd ON c.RoomId = rd.Id
      ORDER BY c.CreatedDate DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get complaints error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve complaints',
      details: errorMessage
    });
  }
});

// Get all complaint types
app.get('/api/complaints/types', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        Type as type,
        CreatedDate as createdDate,
        UpdatedDate as updatedDate
      FROM ComplainType
      ORDER BY Type ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get complaint types error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve complaint types',
      details: errorMessage
    });
  }
});

// Get all complaint statuses
app.get('/api/complaints/statuses', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        Status as status
      FROM ComplaintStatus
      ORDER BY Status ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get complaint statuses error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve complaint statuses',
      details: errorMessage
    });
  }
});

// Create a new complaint
app.post('/api/complaints', async (req: Request, res: Response) => {
  try {
    const {
      description,
      complaintTypeId,
      complaintStatusId,
      roomId,
      charges,
      chargesDetails,
      proof1Url,
      proof2Url,
      videoUrl
    } = req.body;

    // Validation
    if (!description || !complaintTypeId || !complaintStatusId || !roomId) {
      return res.status(400).json({
        error: 'Description, complaint type, status, and room are required'
      });
    }

    const pool = getPool();
    const result = await pool.request()
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('complaintTypeId', sql.Int, complaintTypeId)
      .input('complaintStatusId', sql.Int, complaintStatusId)
      .input('roomId', sql.Int, roomId)
      .input('charges', sql.Decimal(10, 2), charges || 0)
      .input('chargesDetails', sql.NVarChar(sql.MAX), chargesDetails || null)
      .input('proof1Url', sql.NVarChar(sql.MAX), proof1Url || null)
      .input('proof2Url', sql.NVarChar(sql.MAX), proof2Url || null)
      .input('videoUrl', sql.NVarChar(sql.MAX), videoUrl || null)
      .query(`
        INSERT INTO Complains (
          Description, ComplaintTypeId, ComplaintStatusId, RoomId, 
          Charges, ChargesDetails, Proof1Url, Proof2Url, VideoUrl, 
          CreatedDate, UpdatedDate
        )
        VALUES (
          @description, @complaintTypeId, @complaintStatusId, @roomId,
          @charges, @chargesDetails, @proof1Url, @proof2Url, @videoUrl,
          GETDATE(), GETDATE()
        );
        SELECT SCOPE_IDENTITY() as id;
      `);

    const newId = result.recordset[0]?.id;
    res.status(201).json({
      message: 'Complaint created successfully',
      id: newId
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: 'Failed to create complaint',
      details: errorMessage
    });
  }
});

// Update a complaint
app.put('/api/complaints/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      description,
      complaintTypeId,
      complaintStatusId,
      roomId,
      closedDate,
      closureComments,
      charges,
      chargesDetails,
      proof1Url,
      proof2Url,
      videoUrl
    } = req.body;

    // Validation
    if (!description || !complaintTypeId || !complaintStatusId || !roomId) {
      return res.status(400).json({
        error: 'Description, complaint type, status, and room are required'
      });
    }

    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('complaintTypeId', sql.Int, complaintTypeId)
      .input('complaintStatusId', sql.Int, complaintStatusId)
      .input('roomId', sql.Int, roomId)
      .input('closedDate', sql.DateTime, closedDate || null)
      .input('closureComments', sql.NVarChar(sql.MAX), closureComments || null)
      .input('charges', sql.Decimal(10, 2), charges || 0)
      .input('chargesDetails', sql.NVarChar(sql.MAX), chargesDetails || null)
      .input('proof1Url', sql.NVarChar(sql.MAX), proof1Url || null)
      .input('proof2Url', sql.NVarChar(sql.MAX), proof2Url || null)
      .input('videoUrl', sql.NVarChar(sql.MAX), videoUrl || null)
      .query(`
        UPDATE Complains
        SET
          Description = @description,
          ComplaintTypeId = @complaintTypeId,
          ComplaintStatusId = @complaintStatusId,
          RoomId = @roomId,
          ClosedDate = @closedDate,
          ClosureComments = @closureComments,
          Charges = @charges,
          ChargesDetails = @chargesDetails,
          Proof1Url = @proof1Url,
          Proof2Url = @proof2Url,
          VideoUrl = @videoUrl,
          UpdatedDate = GETDATE()
        WHERE Id = @id
      `);

    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('Update complaint error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: 'Failed to update complaint',
      details: errorMessage
    });
  }
});

// Delete a complaint
app.delete('/api/complaints/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM Complains WHERE Id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Delete complaint error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
  }
});

// Upload complaint files
app.post('/api/complaints/upload', upload.fields([
  { name: 'proof1', maxCount: 1 },
  { name: 'proof2', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), (req: Request, res: Response) => {
  try {
    console.log('\n========== FILE UPLOAD REQUEST ==========');
    console.log('Complains directory:', complainsDir);
    console.log('Files received:', req.files);
    
    const uploadedFiles: { [key: string]: string | null } = {
      proof1Url: null,
      proof2Url: null,
      videoUrl: null
    };

    if (req.files && typeof req.files === 'object') {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (files.proof1 && files.proof1[0]) {
        const filename = files.proof1[0].filename;
        uploadedFiles.proof1Url = filename;
        const proof1Path = path.join(complainsDir, filename);
        console.log('Proof1 file saved at:', proof1Path);
        console.log('Proof1 file exists:', fs.existsSync(proof1Path));
        fs.chmod(proof1Path, 0o644, (err) => {
          if (err) console.error('Failed to chmod proof1:', err);
          else console.log('Proof1 permissions set to 644');
        });
      }
      if (files.proof2 && files.proof2[0]) {
        const filename = files.proof2[0].filename;
        uploadedFiles.proof2Url = filename;
        const proof2Path = path.join(complainsDir, filename);
        console.log('Proof2 file saved at:', proof2Path);
        console.log('Proof2 file exists:', fs.existsSync(proof2Path));
        fs.chmod(proof2Path, 0o644, (err) => {
          if (err) console.error('Failed to chmod proof2:', err);
          else console.log('Proof2 permissions set to 644');
        });
      }
      if (files.video && files.video[0]) {
        const filename = files.video[0].filename;
        uploadedFiles.videoUrl = filename;
        const videoPath = path.join(complainsDir, filename);
        console.log('Video file saved at:', videoPath);
        console.log('Video file exists:', fs.existsSync(videoPath));
        fs.chmod(videoPath, 0o644, (err) => {
          if (err) console.error('Failed to chmod video:', err);
          else console.log('Video permissions set to 644');
        });
      }
    }

    console.log('Upload response:', uploadedFiles);
    console.log('=========================================\n');
    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      servingUrls: {
        proof1: uploadedFiles.proof1Url ? `/api/complains/${uploadedFiles.proof1Url}` : null,
        proof2: uploadedFiles.proof2Url ? `/api/complains/${uploadedFiles.proof2Url}` : null,
        video: uploadedFiles.videoUrl ? `/api/complains/${uploadedFiles.videoUrl}` : null
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: 'Failed to upload files',
      details: errorMessage
    });
  }
});

// Service Details Management Endpoints

// Get all service details
app.get('/api/services/details', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        ConsumerNo as consumerNo,
        MeterNo as meterNo,
        Load as load,
        ServiceCategory as serviceCategory,
        ConsumerName as consumerName,
        CreatedDate as createdDate,
        UpdatedDate as updatedDate
      FROM ServiceDetails
      ORDER BY ConsumerName ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get service details error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve service details',
      details: errorMessage
    });
  }
});

// Get single service detail
app.get('/api/services/details/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT 
          Id as id,
          ConsumerNo as consumerNo,
          MeterNo as meterNo,
          Load as load,
          ServiceCategory as serviceCategory,
          ConsumerName as consumerName,
          CreatedDate as createdDate,
          UpdatedDate as updatedDate
        FROM ServiceDetails
        WHERE Id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Service detail not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get service detail error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve service detail',
      details: errorMessage
    });
  }
});

// Create service detail
app.post('/api/services/details', async (req: Request, res: Response) => {
  try {
    const { consumerNo, meterNo, load, serviceCategory, consumerName } = req.body;
    
    if (!consumerNo || !meterNo || !load || !serviceCategory || !consumerName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pool = getPool();
    const result = await pool
      .request()
      .input('consumerNo', sql.NVarChar(50), consumerNo)
      .input('meterNo', sql.Int, meterNo)
      .input('load', sql.NVarChar(10), load)
      .input('serviceCategory', sql.NVarChar(50), serviceCategory)
      .input('consumerName', sql.NVarChar(100), consumerName)
      .query(`
        INSERT INTO ServiceDetails (ConsumerNo, MeterNo, Load, ServiceCategory, ConsumerName, CreatedDate, UpdatedDate)
        VALUES (@consumerNo, @meterNo, @load, @serviceCategory, @consumerName, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
    
    const serviceId = result.recordset[0].id;
    res.status(201).json({ 
      id: serviceId, 
      consumerNo,
      meterNo,
      load,
      serviceCategory,
      consumerName,
      createdDate: new Date().toISOString(),
      message: 'Service detail created successfully' 
    });
  } catch (error) {
    console.error('Create service detail error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to create service detail',
      details: errorMessage
    });
  }
});

// Update service detail
app.put('/api/services/details/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { consumerNo, meterNo, load, serviceCategory, consumerName } = req.body;
    
    if (!consumerNo || !meterNo || !load || !serviceCategory || !consumerName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pool = getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .input('consumerNo', sql.NVarChar(50), consumerNo)
      .input('meterNo', sql.Int, meterNo)
      .input('load', sql.NVarChar(10), load)
      .input('serviceCategory', sql.NVarChar(50), serviceCategory)
      .input('consumerName', sql.NVarChar(100), consumerName)
      .query(`
        UPDATE ServiceDetails 
        SET ConsumerNo = @consumerNo, MeterNo = @meterNo, Load = @load, 
            ServiceCategory = @serviceCategory, ConsumerName = @consumerName, UpdatedDate = GETDATE()
        WHERE Id = @id
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Service detail not found' });
    }
    
    res.json({ message: 'Service detail updated successfully' });
  } catch (error) {
    console.error('Update service detail error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to update service detail',
      details: errorMessage
    });
  }
});

// Delete service detail
app.delete('/api/services/details/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .query(`DELETE FROM ServiceDetails WHERE Id = @id`);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Service detail not found' });
    }
    
    res.json({ message: 'Service detail deleted successfully' });
  } catch (error) {
    console.error('Delete service detail error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to delete service detail',
      details: errorMessage
    });
  }
});

// EB Service Payments Management Endpoints

// Get all EB service payments
app.get('/api/services/payments', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        ServiceId as serviceId,
        ISNULL(CAST(BillAmount AS FLOAT), 0) as billAmount,
        BillDate as billDate,
        CreatedDate as createdDate,
        UpdatedDate as updatedDate,
        BilledUnits as billedUnits
      FROM EBServicePayments
      ORDER BY BillDate DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get EB service payments error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve EB service payments',
      details: errorMessage
    });
  }
});

// Get single EB service payment
app.get('/api/services/payments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT 
          Id as id,
          ServiceId as serviceId,
          ISNULL(CAST(BillAmount AS FLOAT), 0) as billAmount,
          BillDate as billDate,
          CreatedDate as createdDate,
          UpdatedDate as updatedDate,
          BilledUnits as billedUnits
        FROM EBServicePayments
        WHERE Id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'EB service payment not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get EB service payment error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve EB service payment',
      details: errorMessage
    });
  }
});

// Create EB service payment
app.post('/api/services/payments', async (req: Request, res: Response) => {
  try {
    const { serviceId, billAmount, billDate, billedUnits } = req.body;
    
    if (!serviceId || billAmount === undefined || !billDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pool = getPool();
    const result = await pool
      .request()
      .input('serviceId', sql.Int, serviceId)
      .input('billAmount', sql.Money, billAmount)
      .input('billDate', sql.DateTime, billDate)
      .input('billedUnits', sql.Int, billedUnits || null)
      .query(`
        INSERT INTO EBServicePayments (ServiceId, BillAmount, BillDate, CreatedDate, UpdatedDate, BilledUnits)
        VALUES (@serviceId, @billAmount, @billDate, GETDATE(), GETDATE(), @billedUnits);
        SELECT SCOPE_IDENTITY() as id;
      `);
    
    const paymentId = result.recordset[0].id;
    res.status(201).json({ 
      id: paymentId, 
      serviceId,
      billAmount,
      billDate,
      billedUnits,
      createdDate: new Date().toISOString(),
      message: 'EB service payment created successfully' 
    });
  } catch (error) {
    console.error('Create EB service payment error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to create EB service payment',
      details: errorMessage
    });
  }
});

// Update EB service payment
app.put('/api/services/payments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { serviceId, billAmount, billDate, billedUnits } = req.body;
    
    if (!serviceId || billAmount === undefined || !billDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pool = getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .input('serviceId', sql.Int, serviceId)
      .input('billAmount', sql.Money, billAmount)
      .input('billDate', sql.DateTime, billDate)
      .input('billedUnits', sql.Int, billedUnits || null)
      .query(`
        UPDATE EBServicePayments 
        SET ServiceId = @serviceId, BillAmount = @billAmount, BillDate = @billDate, 
            BilledUnits = @billedUnits, UpdatedDate = GETDATE()
        WHERE Id = @id
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'EB service payment not found' });
    }
    
    res.json({ message: 'EB service payment updated successfully' });
  } catch (error) {
    console.error('Update EB service payment error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to update EB service payment',
      details: errorMessage
    });
  }
});

// Delete EB service payment
app.delete('/api/services/payments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .query(`DELETE FROM EBServicePayments WHERE Id = @id`);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'EB service payment not found' });
    }
    
    res.json({ message: 'EB service payment deleted successfully' });
  } catch (error) {
    console.error('Delete EB service payment error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to delete EB service payment',
      details: errorMessage
    });
  }
});

// Get all rooms
app.get('/api/rooms', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        Number as number,
        ISNULL(CAST(Rent AS FLOAT), 0) as rent,
        Beds as beds
      FROM RoomDetail
      ORDER BY Number ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get rooms error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve rooms',
      details: errorMessage
    });
  }
});

// ============ USER MANAGEMENT ENDPOINTS ============

// Get all users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        UserName as userName,
        Name as name,
        CreatedDate as createdDate,
        UpdatedDate as updatedDate,
        NextLoginDuration as nextLoginDuration
      FROM [User]
      ORDER BY Name ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users', details: error });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          Id as id,
          UserName as userName,
          Name as name,
          CreatedDate as createdDate,
          UpdatedDate as updatedDate,
          NextLoginDuration as nextLoginDuration
        FROM [User]
        WHERE Id = @id
      `);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user', details: error });
  }
});

// Create user
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { userName, password, name, nextLoginDuration } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('userName', sql.NVarChar(100), userName)
      .input('password', sql.NVarChar(500), password)
      .input('name', sql.NVarChar(500), name)
      .input('nextLoginDuration', sql.TinyInt, nextLoginDuration || 30)
      .query(`
        INSERT INTO [User] (UserName, Password, Name, CreatedDate, NextLoginDuration)
        VALUES (@userName, @password, @name, GETDATE(), @nextLoginDuration);
        SELECT SCOPE_IDENTITY() as id;
      `);
    res.status(201).json({ id: result.recordset[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user', details: error });
  }
});

// Update user
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, password, name, nextLoginDuration } = req.body;
    const pool = getPool();
    
    const updateQuery = password 
      ? `UPDATE [User] SET UserName = @userName, Password = @password, Name = @name, NextLoginDuration = @nextLoginDuration, UpdatedDate = GETDATE() WHERE Id = @id`
      : `UPDATE [User] SET UserName = @userName, Name = @name, NextLoginDuration = @nextLoginDuration, UpdatedDate = GETDATE() WHERE Id = @id`;
    
    const req1 = pool.request()
      .input('id', sql.Int, id)
      .input('userName', sql.NVarChar(100), userName)
      .input('name', sql.NVarChar(500), name)
      .input('nextLoginDuration', sql.TinyInt, nextLoginDuration || 30);
    
    if (password) {
      req1.input('password', sql.NVarChar(500), password);
    }
    
    await req1.query(updateQuery);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user', details: error });
  }
});

// Delete user
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM [User] WHERE Id = @id');
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user', details: error });
  }
});

// ============ ROLE MANAGEMENT ENDPOINTS ============

// Get all roles
app.get('/api/roles', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        RoleName as roleName,
        RoleType as roleType
      FROM RoleDetail
      ORDER BY RoleName ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve roles', details: error });
  }
});

// Get role by ID
app.get('/api/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          Id as id,
          RoleName as roleName,
          RoleType as roleType
        FROM RoleDetail
        WHERE Id = @id
      `);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve role', details: error });
  }
});

// Create role
app.post('/api/roles', async (req: Request, res: Response) => {
  try {
    const { roleName, roleType } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('roleName', sql.NVarChar(50), roleName)
      .input('roleType', sql.NVarChar(50), roleType)
      .query(`
        INSERT INTO RoleDetail (RoleName, RoleType)
        VALUES (@roleName, @roleType);
        SELECT SCOPE_IDENTITY() as id;
      `);
    res.status(201).json({ id: result.recordset[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role', details: error });
  }
});

// Update role
app.put('/api/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roleName, roleType } = req.body;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('roleName', sql.NVarChar(50), roleName)
      .input('roleType', sql.NVarChar(50), roleType)
      .query('UPDATE RoleDetail SET RoleName = @roleName, RoleType = @roleType WHERE Id = @id');
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role', details: error });
  }
});

// Delete role
app.delete('/api/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM RoleDetail WHERE Id = @id');
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role', details: error });
  }
});

// ============ USER ROLES ENDPOINTS ============

// Get all user roles
app.get('/api/user-roles', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        ur.Id as id,
        ur.UserId as userId,
        ur.RoleId as roleId,
        ur.CreatedDate as createdDate,
        ur.UpdatedDate as updatedDate,
        u.Name as userName,
        u.UserName as username,
        r.RoleName as roleName
      FROM UserRole ur
      LEFT JOIN [User] u ON ur.UserId = u.Id
      LEFT JOIN RoleDetail r ON ur.RoleId = r.Id
      ORDER BY u.Name ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user roles', details: error });
  }
});

// Create user role
app.post('/api/user-roles', async (req: Request, res: Response) => {
  try {
    const { userId, roleId } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('roleId', sql.Int, roleId)
      .query(`
        INSERT INTO UserRole (UserId, RoleId, CreatedDate)
        VALUES (@userId, @roleId, GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
    res.status(201).json({ id: result.recordset[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user role', details: error });
  }
});

// Delete user role
app.delete('/api/user-roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM UserRole WHERE Id = @id');
    res.json({ message: 'User role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user role', details: error });
  }
});

// ============ TRANSACTION ENDPOINTS ============

// Get all transactions
app.get('/api/transactions', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        t.Id as id,
        t.Description as description,
        t.TransactionTypeId as transactionTypeId,
        t.TransactionDate as transactionDate,
        t.CreatedDate as createdDate,
        t.UpdatedDate as updatedDate,
        CAST(t.Amount AS FLOAT) as amount,
        t.OccupancyId as occupancyId,
        tt.TransactionType as 'transactionType.transactionType',
        tt.Id as 'transactionType.id'
      FROM Transactions t
      LEFT JOIN TransactionType tt ON t.TransactionTypeId = tt.Id
      ORDER BY t.TransactionDate DESC
    `);
    const formattedResult = result.recordset.map(row => ({
      id: row.id,
      description: row.description,
      transactionTypeId: row.transactionTypeId,
      transactionDate: row.transactionDate,
      createdDate: row.createdDate,
      updatedDate: row.updatedDate,
      amount: row.amount,
      occupancyId: row.occupancyId,
      transactionType: {
        id: row['transactionType.id'],
        transactionType: row['transactionType.transactionType']
      }
    }));
    res.json(formattedResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve transactions', details: error });
  }
});

// Get transaction by ID
app.get('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          t.Id as id,
          t.Description as description,
          t.TransactionTypeId as transactionTypeId,
          t.TransactionDate as transactionDate,
          t.CreatedDate as createdDate,
          t.UpdatedDate as updatedDate,
          CAST(t.Amount AS FLOAT) as amount,
          t.OccupancyId as occupancyId
        FROM Transactions t
        WHERE t.Id = @id
      `);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve transaction', details: error });
  }
});

// Create transaction
app.post('/api/transactions', async (req: Request, res: Response) => {
  try {
    const { description, transactionTypeId, transactionDate, amount, occupancyId } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('description', sql.NVarChar(500), description)
      .input('transactionTypeId', sql.Int, transactionTypeId)
      .input('transactionDate', sql.DateTime, transactionDate)
      .input('amount', sql.Money, amount)
      .input('occupancyId', sql.Int, occupancyId || null)
      .query(`
        INSERT INTO Transactions (Description, TransactionTypeId, TransactionDate, CreatedDate, Amount, OccupancyId)
        VALUES (@description, @transactionTypeId, @transactionDate, GETDATE(), @amount, @occupancyId);
        SELECT SCOPE_IDENTITY() as id;
      `);
    res.status(201).json({ id: result.recordset[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction', details: error });
  }
});

// Update transaction
app.put('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, transactionTypeId, transactionDate, amount, occupancyId } = req.body;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('description', sql.NVarChar(500), description)
      .input('transactionTypeId', sql.Int, transactionTypeId)
      .input('transactionDate', sql.DateTime, transactionDate)
      .input('amount', sql.Money, amount)
      .input('occupancyId', sql.Int, occupancyId || null)
      .query(`
        UPDATE Transactions 
        SET Description = @description, TransactionTypeId = @transactionTypeId, 
            TransactionDate = @transactionDate, Amount = @amount, OccupancyId = @occupancyId,
            UpdatedDate = GETDATE()
        WHERE Id = @id
      `);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction', details: error });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Transactions WHERE Id = @id');
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction', details: error });
  }
});

// Get transaction types
app.get('/api/transaction-types', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        TransactionType as transactionType
      FROM TransactionType
      ORDER BY TransactionType ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve transaction types', details: error });
  }
});

// ============ STOCK MANAGEMENT ENDPOINTS ============

// Get all stocks
app.get('/api/stock', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        [Name] as name,
        Description as description,
        Quantity as quantity,
        CreatedDate as createdDate,
        CreatedBy as createdBy,
        UpdatedDate as updatedDate,
        UpdatedBy as updatedBy,
        ImageURL as imageURL
      FROM StockDetails
      ORDER BY [Name] ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stock', details: error });
  }
});

// Get stock by ID
app.get('/api/stock/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          Id as id,
          [Name] as name,
          Description as description,
          Quantity as quantity,
          CreatedDate as createdDate,
          CreatedBy as createdBy,
          UpdatedDate as updatedDate,
          UpdatedBy as updatedBy,
          ImageURL as imageURL
        FROM StockDetails
        WHERE Id = @id
      `);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stock', details: error });
  }
});

// Create stock
app.post('/api/stock', async (req: Request, res: Response) => {
  try {
    const { name, description, quantity, createdBy } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar(50), name)
      .input('description', sql.NVarChar(500), description || null)
      .input('quantity', sql.SmallInt, quantity)
      .input('createdBy', sql.VarChar(50), createdBy)
      .query(`
        INSERT INTO StockDetails ([Name], Description, Quantity, CreatedDate, CreatedBy)
        VALUES (@name, @description, @quantity, GETDATE(), @createdBy);
        SELECT SCOPE_IDENTITY() as id;
      `);
    res.status(201).json({ id: result.recordset[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock', details: error });
  }
});

// Update stock
app.put('/api/stock/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, quantity, updatedBy } = req.body;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(50), name)
      .input('description', sql.NVarChar(500), description || null)
      .input('quantity', sql.SmallInt, quantity)
      .input('updatedBy', sql.VarChar(50), updatedBy || 'Admin')
      .query(`
        UPDATE StockDetails 
        SET [Name] = @name, Description = @description, Quantity = @quantity, 
            UpdatedDate = GETDATE(), UpdatedBy = @updatedBy
        WHERE Id = @id
      `);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock', details: error });
  }
});

// Delete stock
app.delete('/api/stock/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM StockDetails WHERE Id = @id');
    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock', details: error });
  }
});

// ============ DAILY STATUS ENDPOINTS ============

// Get all daily statuses
app.get('/api/daily-status', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id,
        [Date] as date,
        RoomStatus as roomStatus,
        WaterLevelStatus as waterLevelStatus,
        CreatedDate as createdDate
      FROM DailyRoomStatus
      ORDER BY [Date] DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve daily statuses', details: error });
  }
});

// Get daily status by ID
app.get('/api/daily-status/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          Id as id,
          [Date] as date,
          RoomStatus as roomStatus,
          WaterLevelStatus as waterLevelStatus,
          CreatedDate as createdDate
        FROM DailyRoomStatus
        WHERE Id = @id
      `);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Daily status not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve daily status', details: error });
  }
});

// Create daily status
app.post('/api/daily-status', async (req: Request, res: Response) => {
  try {
    const { date, roomStatus, waterLevelStatus } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('date', sql.DateTime, date)
      .input('roomStatus', sql.VarChar(1000), roomStatus || null)
      .input('waterLevelStatus', sql.VarChar(1000), waterLevelStatus || null)
      .query(`
        INSERT INTO DailyRoomStatus ([Date], RoomStatus, WaterLevelStatus, CreatedDate)
        VALUES (@date, @roomStatus, @waterLevelStatus, GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
    res.status(201).json({ id: result.recordset[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create daily status', details: error });
  }
});

// Update daily status
app.put('/api/daily-status/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, roomStatus, waterLevelStatus } = req.body;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('date', sql.DateTime, date)
      .input('roomStatus', sql.VarChar(1000), roomStatus || null)
      .input('waterLevelStatus', sql.VarChar(1000), waterLevelStatus || null)
      .query(`
        UPDATE DailyRoomStatus 
        SET [Date] = @date, RoomStatus = @roomStatus, WaterLevelStatus = @waterLevelStatus
        WHERE Id = @id
      `);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update daily status', details: error });
  }
});

// Delete daily status
app.delete('/api/daily-status/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM DailyRoomStatus WHERE Id = @id');
    res.json({ message: 'Daily status deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete daily status', details: error });
  }
});

// ============ DAILY STATUS MEDIA ENDPOINTS ============

// Get media for a daily status
app.get('/api/daily-status/:id/media', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.request()
      .input('dailyStatusId', sql.Int, id)
      .query(`
        SELECT 
          Id as id,
          DailyStatusId as dailyStatusId,
          MediaType as mediaType,
          SequenceNumber as sequenceNumber,
          FileName as fileName,
          FilePath as filePath,
          FileSize as fileSize,
          MimeType as mimeType,
          UploadedDate as uploadedDate,
          CreatedBy as createdBy
        FROM DailyRoomStatusMedia
        WHERE DailyStatusId = @dailyStatusId
        ORDER BY MediaType ASC, SequenceNumber ASC
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve media', details: error });
  }
});

// Get media for a daily status
app.get('/api/all-media/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          Id as id,
          DailyStatusId as dailyStatusId,
          MediaType as mediaType,
          SequenceNumber as sequenceNumber,
          FileName as fileName,
          FilePath as filePath,
          FileSize as fileSize,
          MimeType as mimeType,
          UploadedDate as uploadedDate,
          CreatedBy as createdBy
        FROM DailyRoomStatusMedia
        ORDER BY MediaType ASC, SequenceNumber ASC
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve media', details: error });
  }
});

// Upload media for a daily status
app.post('/api/daily-status/upload', uploadDailyStatusMedia.array('files', 4), async (req: Request, res: Response) => {
  try {
    const { dailyStatusId, mediaType } = req.body;
    
    if (!dailyStatusId || !mediaType) {
      return res.status(400).json({ error: 'dailyStatusId and mediaType are required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const pool = getPool();
    const uploadedMedia = [];

    // Get the current max sequence number for this media type
    const seqResult = await pool.request()
      .input('dailyStatusId', sql.Int, dailyStatusId)
      .input('mediaType', sql.VarChar(50), mediaType)
      .query(`
        SELECT ISNULL(MAX(SequenceNumber), 0) as maxSeq
        FROM DailyRoomStatusMedia
        WHERE DailyStatusId = @dailyStatusId AND MediaType = @mediaType
      `);

    let sequenceNumber = (seqResult.recordset[0]?.maxSeq || 0) + 1;

    for (const file of req.files as Express.Multer.File[]) {
      // Limit to 2 per type
      if (sequenceNumber > 2) {
        // Delete the extra file
        fs.unlinkSync(file.path);
        continue;
      }

      const filePath = `/daily-status-media/${path.basename(file.path)}`;
      
      const insertResult = await pool.request()
        .input('dailyStatusId', sql.Int, dailyStatusId)
        .input('mediaType', sql.VarChar(50), mediaType)
        .input('sequenceNumber', sql.Int, sequenceNumber)
        .input('fileName', sql.VarChar(500), file.originalname)
        .input('filePath', sql.VarChar(1000), filePath)
        .input('fileSize', sql.BigInt, file.size)
        .input('mimeType', sql.VarChar(100), file.mimetype)
        .query(`
          INSERT INTO DailyRoomStatusMedia (DailyStatusId, MediaType, SequenceNumber, FileName, FilePath, FileSize, MimeType, UploadedDate)
          VALUES (@dailyStatusId, @mediaType, @sequenceNumber, @fileName, @filePath, @fileSize, @mimeType, GETDATE());
          SELECT SCOPE_IDENTITY() as id;
        `);

      uploadedMedia.push({
        id: insertResult.recordset[0].id,
        dailyStatusId,
        mediaType,
        sequenceNumber,
        fileName: file.originalname,
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype
      });

      sequenceNumber++;
    }

    res.status(201).json({
      message: 'Media uploaded successfully',
      uploadedMedia
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: 'Failed to upload media', details: error });
  }
});

// Delete media file
app.delete('/api/daily-status/media/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get the file path first
    const mediaResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT FilePath FROM DailyRoomStatusMedia WHERE Id = @id
      `);

    if (!mediaResult.recordset.length) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const filePath = mediaResult.recordset[0].FilePath;
    
    // Delete from database
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM DailyRoomStatusMedia WHERE Id = @id');

    // Delete the file from disk
    const fullPath = path.join(dailyStatusMediaDir, path.basename(filePath));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete media', details: error });
  }
});

// ============ SERVICE ALLOCATION ENDPOINTS ============

// Get all service allocations
app.get('/api/service-allocations', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        sa.Id as id,
        sa.ServiceId as serviceId,
        sa.RoomId as roomId,
        sd.ConsumerNo as 'service.consumerNo',
        sd.MeterNo as 'service.meterNo',
        sd.[Load] as 'service.load',
        sd.ServiceCategory as 'service.serviceCategory',
        sd.ConsumerName as 'service.consumerName',
        sd.Id as 'service.id',
        rd.Number as 'room.number',
        rd.Rent as 'room.rent',
        rd.Beds as 'room.beds',
        rd.Id as 'room.id'
      FROM ServiceRoomAllocation sa
      LEFT JOIN ServiceDetails sd ON sa.ServiceId = sd.Id
      LEFT JOIN RoomDetail rd ON sa.RoomId = rd.Id
      ORDER BY sd.ConsumerName, rd.Number ASC
    `);
    const formattedResult = result.recordset.map(row => ({
      id: row.id,
      serviceId: row.serviceId,
      roomId: row.roomId,
      service: {
        id: row['service.id'],
        consumerNo: row['service.consumerNo'],
        meterNo: row['service.meterNo'],
        load: row['service.load'],
        serviceCategory: row['service.serviceCategory'],
        consumerName: row['service.consumerName']
      },
      room: {
        id: row['room.id'],
        number: row['room.number'],
        rent: row['room.rent'],
        beds: row['room.beds']
      }
    }));
    res.json(formattedResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve service allocations', details: error });
  }
});

// Get service allocation by ID
app.get('/api/service-allocations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          sa.Id as id,
          sa.ServiceId as serviceId,
          sa.RoomId as roomId
        FROM ServiceRoomAllocation sa
        WHERE sa.Id = @id
      `);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Service allocation not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve service allocation', details: error });
  }
});

// Create service allocation
app.post('/api/service-allocations', async (req: Request, res: Response) => {
  try {
    const { serviceId, roomId } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('serviceId', sql.Int, serviceId)
      .input('roomId', sql.Int, roomId)
      .query(`
        INSERT INTO ServiceRoomAllocation (ServiceId, RoomId)
        VALUES (@serviceId, @roomId);
        SELECT SCOPE_IDENTITY() as id;
      `);
    res.status(201).json({ id: result.recordset[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service allocation', details: error });
  }
});

// Update service allocation
app.put('/api/service-allocations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { serviceId, roomId } = req.body;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('serviceId', sql.Int, serviceId)
      .input('roomId', sql.Int, roomId)
      .query(`
        UPDATE ServiceRoomAllocation 
        SET ServiceId = @serviceId, RoomId = @roomId
        WHERE Id = @id
      `);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service allocation', details: error });
  }
});

// Delete service allocation
app.delete('/api/service-allocations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM ServiceRoomAllocation WHERE Id = @id');
    res.json({ message: 'Service allocation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service allocation', details: error });
  }
});

// Get service allocations with last payment details
app.get('/api/service-allocations-with-payments', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        sa.Id as id,
        sa.ServiceId as serviceId,
        sa.RoomId as roomId,
        sd.ConsumerNo as 'service.consumerNo',
        sd.MeterNo as 'service.meterNo',
        sd.[Load] as 'service.load',
        sd.ServiceCategory as 'service.serviceCategory',
        sd.ConsumerName as 'service.consumerName',
        sd.Id as 'service.id',
        rd.Number as 'room.number',
        rd.Rent as 'room.rent',
        rd.Beds as 'room.beds',
        rd.Id as 'room.id',
        esp.Id as 'lastPayment.id',
        esp.BillAmount as 'lastPayment.billAmount',
        esp.BillDate as 'lastPayment.billDate',
        esp.BilledUnits as 'lastPayment.billedUnits',
        esp.CreatedDate as 'lastPayment.createdDate'
      FROM ServiceRoomAllocation sa
      LEFT JOIN ServiceDetails sd ON sa.ServiceId = sd.Id
      LEFT JOIN RoomDetail rd ON sa.RoomId = rd.Id
      LEFT JOIN (
        SELECT Id, ServiceId, BillAmount, BillDate, BilledUnits, CreatedDate,
               ROW_NUMBER() OVER (PARTITION BY ServiceId ORDER BY BillDate DESC) as rn
        FROM EBServicePayments
      ) esp ON sa.ServiceId = esp.ServiceId AND esp.rn = 1
      ORDER BY sd.ConsumerName, rd.Number ASC
    `);
    const formattedResult = result.recordset.map(row => ({
      id: row.id,
      serviceId: row.serviceId,
      roomId: row.roomId,
      service: {
        id: row['service.id'],
        consumerNo: row['service.consumerNo'],
        meterNo: row['service.meterNo'],
        load: row['service.load'],
        serviceCategory: row['service.serviceCategory'],
        consumerName: row['service.consumerName']
      },
      room: {
        id: row['room.id'],
        number: row['room.number'],
        rent: row['room.rent'],
        beds: row['room.beds']
      },
      lastPayment: row['lastPayment.id'] ? {
        id: row['lastPayment.id'],
        billAmount: row['lastPayment.billAmount'],
        billDate: row['lastPayment.billDate'],
        billedUnits: row['lastPayment.billedUnits'],
        createdDate: row['lastPayment.createdDate']
      } : null
    }));
    res.json(formattedResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve service allocations with payments', details: error });
  }
});

// Get service allocations for meter reading (searchable)
app.get('/api/service-allocations-for-reading', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const pool = getPool();
    
    let query = `
      SELECT 
        sra.Id as id,
        sra.ServiceId as serviceId,
        sra.RoomId as roomId,
        rd.Number as roomNumber,
        sd.ConsumerNo as consumerNo,
        sd.ConsumerName as consumerName,
        sd.MeterNo as meterNo,
        CONCAT(rd.Number, ' - ', sd.ConsumerName, ' (', sd.ConsumerNo, ')') as displayName
      FROM ServiceRoomAllocation sra
      INNER JOIN ServiceDetails sd ON sra.ServiceId = sd.Id
      INNER JOIN RoomDetail rd ON sra.RoomId = rd.Id
    `;
    
    const request = pool.request();
    
    if (search) {
      query += ` WHERE rd.Number LIKE @search
                    OR sd.ConsumerName LIKE @search
                    OR sd.ConsumerNo LIKE @search`;
      request.input('search', sql.NVarChar(100), `%${search}%`);
    }
    
    query += ` ORDER BY rd.Number ASC, sd.ConsumerName ASC`;
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get service allocations for reading error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Failed to retrieve service allocations',
      details: errorMessage
    });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Service Consumption endpoints

// Get previous month's ending meter reading for a service allocation
app.get('/api/service-consumption/previous-month-reading/:serviceAllocId/:month/:year', async (req: Request, res: Response) => {
  try {
    const { serviceAllocId, month, year } = req.params;
    const pool = getPool();
    
    // Calculate previous month
    let prevMonth = parseInt(month) - 1;
    let prevYear = parseInt(year);
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    
    const result = await pool
      .request()
      .input('serviceAllocId', sql.Int, parseInt(serviceAllocId))
      .input('prevYear', sql.Int, prevYear)
      .input('prevMonth', sql.Int, prevMonth)
      .query(`
        SELECT TOP 1
          scd.EndingMeterReading as endingMeterReading,
          scd.ReadingTakenDate as readingTakenDate
        FROM ServiceConsumptionDetails scd
        WHERE scd.ServiceAllocId = @serviceAllocId
          AND YEAR(scd.ReadingTakenDate) = @prevYear
          AND MONTH(scd.ReadingTakenDate) = @prevMonth
        ORDER BY scd.ReadingTakenDate DESC
      `);
    
    if (!res.headersSent) {
      res.json(result.recordset);
    }
  } catch (error) {
    console.error('Get previous month reading error:', error);
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Failed to retrieve previous month reading',
        details: errorMessage
      });
    }
  }
});

// Get service consumption details
app.get('/api/service-consumption', async (req: Request, res: Response) => {
  try {
    const { serviceAllocId, startDate, endDate, roomId } = req.query;
    const pool = getPool();
    
    let query = `
      SELECT 
        scd.Id as id,
        scd.ServiceAllocId as serviceAllocId,
        sra.ServiceId as serviceId,
        sra.RoomId as roomId,
        rd.Number as roomNumber,
        sd.ConsumerNo as consumerNo,
        sd.ConsumerName as consumerName,
        sd.MeterNo as meterNo,
        scd.ReadingTakenDate as readingTakenDate,
        scd.StartingMeterReading as startingMeterReading,
        scd.EndingMeterReading as endingMeterReading,
        scd.UnitsConsumed as unitsConsumed,
        scd.AmountToBeCollected as amountToBeCollected,
        scd.UnitRate as unitRate,
        scd.MeterPhoto1Url as meterPhoto1Url,
        scd.MeterPhoto2Url as meterPhoto2Url,
        scd.MeterPhoto3Url as meterPhoto3Url,
        scd.CreatedDate as createdDate,
        scd.UpdatedDate as updatedDate
      FROM ServiceConsumptionDetails scd
      LEFT JOIN ServiceRoomAllocation sra ON scd.ServiceAllocId = sra.Id
      LEFT JOIN RoomDetail rd ON sra.RoomId = rd.Id
      LEFT JOIN ServiceDetails sd ON sra.ServiceId = sd.Id
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    if (serviceAllocId) {
      query += ` AND scd.ServiceAllocId = @serviceAllocId`;
      request.input('serviceAllocId', sql.Int, parseInt(serviceAllocId as string));
    }
    
    if (roomId) {
      query += ` AND sra.RoomId = @roomId`;
      request.input('roomId', sql.Int, parseInt(roomId as string));
    }
    
    if (startDate) {
      query += ` AND scd.ReadingTakenDate >= @startDate`;
      request.input('startDate', sql.DateTime, new Date(startDate as string));
    }
    
    if (endDate) {
      query += ` AND scd.ReadingTakenDate <= @endDate`;
      request.input('endDate', sql.DateTime, new Date(endDate as string));
    }
    
    query += ` ORDER BY scd.ReadingTakenDate DESC`;
    
    const result = await request.query(query);
    if (!res.headersSent) {
      res.json(result.recordset);
    }
  } catch (error) {
    console.error('Get service consumption error:', error);
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Failed to retrieve service consumption details',
        details: errorMessage
      });
    }
  }
});


// Get service consumption by ID
app.get('/api/service-consumption/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT 
          scd.Id as id,
          scd.ServiceAllocId as serviceAllocId,
          sra.ServiceId as serviceId,
          sra.RoomId as roomId,
          rd.Number as roomNumber,
          sd.ConsumerNo as consumerNo,
          sd.ConsumerName as consumerName,
          sd.MeterNo as meterNo,
          scd.ReadingTakenDate as readingTakenDate,
          scd.StartingMeterReading as startingMeterReading,
          scd.EndingMeterReading as endingMeterReading,
          scd.UnitsConsumed as unitsConsumed,
          scd.AmountToBeCollected as amountToBeCollected,
          scd.UnitRate as unitRate,
          scd.MeterPhoto1Url as meterPhoto1Url,
          scd.MeterPhoto2Url as meterPhoto2Url,
          scd.MeterPhoto3Url as meterPhoto3Url,
          scd.CreatedDate as createdDate,
          scd.UpdatedDate as updatedDate
        FROM ServiceConsumptionDetails scd
        LEFT JOIN ServiceRoomAllocation sra ON scd.ServiceAllocId = sra.Id
        LEFT JOIN RoomDetail rd ON sra.RoomId = rd.Id
        LEFT JOIN ServiceDetails sd ON sra.ServiceId = sd.Id
        WHERE scd.Id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Service consumption detail not found' });
    }
    
    if (!res.headersSent) {
      res.json(result.recordset[0]);
    }
  } catch (error) {
    console.error('Get service consumption detail error:', error);
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Failed to retrieve service consumption detail',
        details: errorMessage
      });
    }
  }
});

// Create service consumption
app.post('/api/service-consumption', async (req: Request, res: Response) => {
  try {
    const { 
      serviceAllocId, 
      readingTakenDate, 
      startingMeterReading, 
      endingMeterReading, 
      unitRate,
      isAutoFilledStartingReading
    } = req.body;
    
    // Validation
    if (!serviceAllocId || !readingTakenDate || startingMeterReading === undefined || endingMeterReading === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }
    
    const pool = getPool();
    
    // Calculate units consumed
    const unitsConsumed = parseInt(endingMeterReading) - parseInt(startingMeterReading);
    const amountToBeCollected = unitsConsumed * (unitRate || 10);
    
    // Handle photo uploads - store photo URLs from request body
    const photoUrls: (string | null)[] = [null, null, null];
    if (req.body.meterPhoto1) photoUrls[0] = req.body.meterPhoto1;
    if (req.body.meterPhoto2) photoUrls[1] = req.body.meterPhoto2;
    if (req.body.meterPhoto3) photoUrls[2] = req.body.meterPhoto3;
    
    const request = pool.request()
      .input('serviceAllocId', sql.Int, parseInt(serviceAllocId))
      .input('readingTakenDate', sql.DateTime, new Date(readingTakenDate))
      .input('startingMeterReading', sql.Int, parseInt(startingMeterReading))
      .input('endingMeterReading', sql.NVarChar(10), String(endingMeterReading))
      .input('unitsConsumed', sql.Int, unitsConsumed)
      .input('amountToBeCollected', sql.Money, amountToBeCollected)
      .input('unitRate', sql.Money, unitRate || 10)
      .input('createdDate', sql.DateTime, new Date())
      .input('meterPhoto1Url', sql.NVarChar(sql.MAX), photoUrls[0] || null)
      .input('meterPhoto2Url', sql.NVarChar(sql.MAX), photoUrls[1] || null)
      .input('meterPhoto3Url', sql.NVarChar(sql.MAX), photoUrls[2] || null)
      .input('isAutoFilledStartingReading', sql.Bit, isAutoFilledStartingReading ? 1 : 0);
    
    const result = await request.query(`
      INSERT INTO ServiceConsumptionDetails (
        ServiceAllocId,
        ReadingTakenDate,
        StartingMeterReading,
        EndingMeterReading,
        UnitsConsumed,
        AmountToBeCollected,
        UnitRate,
        MeterPhoto1Url,
        MeterPhoto2Url,
        MeterPhoto3Url,
        IsAutoFilledStartingReading,
        CreatedDate
      )
      VALUES (
        @serviceAllocId,
        @readingTakenDate,
        @startingMeterReading,
        @endingMeterReading,
        @unitsConsumed,
        @amountToBeCollected,
        @unitRate,
        @meterPhoto1Url,
        @meterPhoto2Url,
        @meterPhoto3Url,
        @isAutoFilledStartingReading,
        @createdDate
      );
      SELECT SCOPE_IDENTITY() as id;
    `);
    
    const consumptionId = result.recordset[0].id;
    
    // Fetch the created record with all details
    const fetchResult = await pool
      .request()
      .input('id', sql.Int, consumptionId)
      .query(`
        SELECT 
          scd.Id as id,
          scd.ServiceAllocId as serviceAllocId,
          sra.ServiceId as serviceId,
          sra.RoomId as roomId,
          rd.Number as roomNumber,
          sd.ConsumerNo as consumerNo,
          sd.ConsumerName as consumerName,
          sd.MeterNo as meterNo,
          scd.ReadingTakenDate as readingTakenDate,
          scd.StartingMeterReading as startingMeterReading,
          scd.EndingMeterReading as endingMeterReading,
          scd.UnitsConsumed as unitsConsumed,
          scd.AmountToBeCollected as amountToBeCollected,
          scd.UnitRate as unitRate,
          scd.MeterPhoto1Url as meterPhoto1Url,
          scd.MeterPhoto2Url as meterPhoto2Url,
          scd.MeterPhoto3Url as meterPhoto3Url,
          scd.IsAutoFilledStartingReading as isAutoFilledStartingReading,
          scd.CreatedDate as createdDate,
          scd.UpdatedDate as updatedDate
        FROM ServiceConsumptionDetails scd
        LEFT JOIN ServiceRoomAllocation sra ON scd.ServiceAllocId = sra.Id
        LEFT JOIN RoomDetail rd ON sra.RoomId = rd.Id
        LEFT JOIN ServiceDetails sd ON sra.ServiceId = sd.Id
        WHERE scd.Id = @id
      `);
    
    if (!res.headersSent) {
      res.status(201).json(fetchResult.recordset[0]);
    }
  } catch (error) {
    console.error('Create service consumption error:', error);
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Failed to create service consumption detail',
        details: errorMessage
      });
    }
  }
});

// Delete service consumption
app.delete('/api/service-consumption/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        DELETE FROM ServiceConsumptionDetails
        WHERE Id = @id
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Service consumption detail not found' });
    }
    
    if (!res.headersSent) {
      res.json({ message: 'Service consumption detail deleted successfully' });
    }
  } catch (error) {
    console.error('Delete service consumption error:', error);
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Failed to delete service consumption detail',
        details: errorMessage
      });
    }
  }
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
