import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { initializeDatabase, closeDatabase, getPool } from './database';
import sql from 'mssql';
import jwt from 'jsonwebtoken';

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

    // Demo credentials for testing (in production, query database and hash passwords)
    const demoUsers = [
      { id: 1, username: 'admin', password: 'admin123', email: 'admin@mansion.com', role: 'admin' },
      { id: 2, username: 'manager', password: 'manager123', email: 'manager@mansion.com', role: 'manager' },
      { id: 3, username: 'user', password: 'user123', email: 'user@mansion.com', role: 'user' }
    ];

    // Find user by username
    const user = demoUsers.find(u => u.username === username);

    if (!user || user.password !== password) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
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
        email: user.email,
        role: user.role
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
          rc.OccupancyId as occupancyId,
          t.Id as tenantId,
          t.Name as tenantName,
          rd.Number as roomNumber,
          ISNULL(o.RentFixed, rd.Rent) as rentFixed,
          rc.RentReceivedOn as rentReceivedOn,
          ISNULL(CAST(rc.RentReceived AS FLOAT), 0) as rentReceived,
          ISNULL(CAST(rc.RentBalance AS FLOAT), 0) as rentBalance,
          MONTH(CAST(rc.RentReceivedOn AS DATE)) as [month],
          YEAR(CAST(rc.RentReceivedOn AS DATE)) as [year],
          CASE 
            WHEN ISNULL(CAST(rc.RentBalance AS FLOAT), 0) = 0 THEN 'paid'
            WHEN ISNULL(CAST(rc.RentReceived AS FLOAT), 0) > 0 THEN 'partial'
            ELSE 'pending'
          END as paymentStatus
        FROM RentalCollection rc
        INNER JOIN Occupancy o ON rc.OccupancyId = o.Id
        INNER JOIN Tenant t ON o.TenantId = t.Id
        INNER JOIN RoomDetail rd ON o.RoomId = rd.Id
        WHERE YEAR(CAST(rc.RentReceivedOn AS DATE)) = @year
          AND MONTH(CAST(rc.RentReceivedOn AS DATE)) = @month
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
