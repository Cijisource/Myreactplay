const { getConnection, sql } = require('../config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Hash password
async function hashPassword(password) {
  try {
    console.log('[HASH] Starting password hash for password length:', password?.length);
    const salt = await bcrypt.genSalt(10);
    console.log('[HASH] Salt generated:', salt);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('[HASH] Password hashed successfully');
    console.log('[HASH] Original password length:', password?.length);
    console.log('[HASH] Hashed password length:', hashedPassword?.length);
    console.log('[HASH] Hashed password:', hashedPassword);
    return hashedPassword;
  } catch (error) {
    console.error('[HASH] Error during hashing:', error);
    throw error;
  }
}

// Compare password
async function comparePassword(password, hashedPassword) {
  console.log('[COMPARE] Password length:', password?.length, 'characters');
  console.log('[COMPARE] Hash length:', hashedPassword?.length, 'characters');
  console.log('[COMPARE] Comparing password:', password, 'with hash:', hashedPassword);
  
  // Check if the stored password looks like a bcrypt hash
  const isBcryptHash = hashedPassword && (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$'));
  console.log('[COMPARE] Is bcrypt hash?:', isBcryptHash);
  
  let isMatch;
  
  if (isBcryptHash) {
    // Use bcrypt for hashed passwords
    console.log('[COMPARE] Using bcrypt.compare() for hashed password');
    isMatch = await bcrypt.compare(password, hashedPassword);
  } else {
    // Fallback: simple string comparison for plain text passwords (temporary workaround)
    console.warn('[COMPARE] WARNING: Plain text password detected in database!');
    console.warn('[COMPARE] Using plain text comparison (NOT SECURE - for testing only)');
    isMatch = password === hashedPassword;
  }
  
  console.log('[COMPARE] Password match result:', isMatch);
  return isMatch;
}

// Generate JWT token
function generateToken(user) {
  const token = jwt.sign(
    {
      userId: user.Id,
      userName: user.UserName,
      name: user.Name,
      roleType: user.RoleType,
      roleId: user.RoleId
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
  return token;
}

// Register a new user
async function registerUser(userName, password, name) {
  try {
    const pool = await getConnection();
    console.log('[REGISTER] Starting registration for user:', userName);
    
    // Check if user already exists
    const existingUser = await pool.request()
      .input('userName', sql.NVarChar, userName)
      .query('SELECT * FROM [User] WHERE UserName = @userName');

    if (existingUser.recordset.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    console.log('[REGISTER] Hashing password...');
    const hashedPassword = await hashPassword(password);
    console.log('[REGISTER] Hashed password stored in variable. Length:', hashedPassword?.length);
    console.log('[REGISTER] About to insert user with hashed password');

    // Insert new user
    const result = await pool.request()
      .input('userName', sql.NVarChar, userName)
      .input('password', sql.NVarChar, hashedPassword)
      .input('name', sql.NVarChar, name)
      .input('createdDate', sql.DateTime2, new Date())
      .query(`
        INSERT INTO [User] (UserName, Password, Name, CreatedDate)
        VALUES (@userName, @password, @name, @createdDate)
        SELECT SCOPE_IDENTITY() as Id
      `);

    console.log('[REGISTER] User inserted with ID:', result.recordset[0].Id);
    const userId = result.recordset[0].Id;

    // Assign default role (e.g., Customer)
    // First, find the default role
    const roleResult = await pool.request()
      .input('roleType', sql.NVarChar, 'Customer')
      .query('SELECT Id FROM RoleDetail WHERE RoleType = @roleType');

    if (roleResult.recordset.length > 0) {
      const roleId = roleResult.recordset[0].Id;
      console.log('[REGISTER] Assigning Customer role (ID:', roleId, ') to user');
      
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('roleId', sql.Int, roleId)
        .input('createdDate', sql.DateTime2, new Date())
        .query(`
          INSERT INTO UserRole (UserId, RoleId, CreatedDate)
          VALUES (@userId, @roleId, @createdDate)
        `);
      console.log('[REGISTER] Role assigned successfully');
    } else {
      console.warn('[REGISTER] Customer role not found in RoleDetail table');
    }

    console.log('[REGISTER] Registration complete for user:', userName);
    return { userId, userName, name };
  } catch (error) {
    console.error('[REGISTER] Registration error:', error.message);
    throw error;
  }
}

// Login user
async function loginUser(userName, password) {
  try {
    const pool = await getConnection();
    console.log('[LOGIN] Database connection established for loginUser');
    console.log('[LOGIN] Attempting to find user:', userName);
    console.log('[LOGIN] Password provided:', password ? 'Yes' : 'No');
    console.log('[LOGIN] Password:', password);

    // Get user with role information
    const result = await pool.request()
      .input('userName', sql.NVarChar, userName)
      .query(`
        SELECT 
          u.Id,
          u.UserName,
          u.Password,
          u.Name,
          u.CreatedDate,
          u.LastLogin,
          rd.Id as RoleId,
          rd.RoleName,
          rd.RoleType
        FROM [User] u
        LEFT JOIN UserRole ur ON u.Id = ur.UserId
        LEFT JOIN RoleDetail rd ON ur.RoleId = rd.Id
        WHERE u.UserName = @userName
      `);

    console.log('[LOGIN] Query result received:', result);
    console.log('[LOGIN] Result recordset:', result.recordset);
    console.log('[LOGIN] Result recordset length:', result.recordset ? result.recordset.length : 'undefined');

    if (!result || !result.recordset || result.recordset.length === 0) {
      console.log('[LOGIN] User not found or recordset empty');
      throw new Error('Invalid username or password');
    }

    const user = result.recordset[0];
    console.log('[LOGIN] User found:', { id: user.Id, userName: user.UserName, name: user.Name });
    console.log('[LOGIN] Password from database length:', user.Password?.length);
    console.log('[LOGIN] Password from database:', user.Password);
    console.log('[LOGIN] Is password a bcrypt hash? (should start with $2a$ or $2b$):', user.Password?.startsWith('$2'));
    console.log('[LOGIN] User object:', user);

    // Compare password
    console.log('[LOGIN] About to compare password...');
    const isPasswordValid = await comparePassword(password, user.Password);
    console.log('[LOGIN] Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Update last login
    await pool.request()
      .input('userId', sql.Int, user.Id)
      .input('lastLogin', sql.DateTime2, new Date())
      .query('UPDATE [User] SET LastLogin = @lastLogin WHERE Id = @userId');

    console.log('[LOGIN] Last login updated for user:', user.UserName);

    // Generate token
    const token = generateToken(user);
    console.log('[LOGIN] Token generated successfully');

    const loginResponse = {
      token,
      user: {
        id: user.Id,
        userName: user.UserName,
        name: user.Name,
        role: user.RoleName,
        roleType: user.RoleType,
        roleId: user.RoleId
      }
    };

    console.log('[LOGIN] Login successful for user:', user.UserName);
    return loginResponse;
  } catch (error) {
    console.error('[LOGIN] Error during login:', error.message);
    console.error('[LOGIN] Full error:', error);
    throw error;
  }
}

// Get user by ID
async function getUserById(userId) {
  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          u.Id,
          u.UserName,
          u.Name,
          u.CreatedDate,
          u.LastLogin,
          rd.RoleName,
          rd.RoleType
        FROM [User] u
        LEFT JOIN UserRole ur ON u.Id = ur.UserId
        LEFT JOIN RoleDetail rd ON ur.RoleId = rd.Id
        WHERE u.Id = @userId
      `);

    if (result.recordset.length === 0) {
      throw new Error('User not found');
    }

    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

// Update user role
async function updateUserRole(userId, roleId) {
  try {
    const pool = await getConnection();

    // Remove existing role
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM UserRole WHERE UserId = @userId');

    // Assign new role
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('roleId', sql.Int, roleId)
      .input('createdDate', sql.DateTime2, new Date())
      .query(`
        INSERT INTO UserRole (UserId, RoleId, CreatedDate)
        VALUES (@userId, @roleId, @createdDate)
      `);

    return { userId, roleId };
  } catch (error) {
    throw error;
  }
}

// Get all users with their roles
async function getAllUsers() {
  try {
    const pool = await getConnection();

    const result = await pool.request()
      .query(`
        SELECT 
          u.Id,
          u.UserName,
          u.Name,
          u.CreatedDate,
          u.LastLogin,
          rd.Id as RoleId,
          rd.RoleName,
          rd.RoleType
        FROM [User] u
        LEFT JOIN UserRole ur ON u.Id = ur.UserId
        LEFT JOIN RoleDetail rd ON ur.RoleId = rd.Id
        ORDER BY u.CreatedDate DESC
      `);

    return result.recordset;
  } catch (error) {
    console.error('[GET_ALL_USERS] Error:', error);
    throw error;
  }
}

// Get all roles
async function getAllRoles() {
  try {
    const pool = await getConnection();

    const result = await pool.request()
      .query('SELECT Id, RoleName, RoleType FROM RoleDetail ORDER BY RoleName');

    return result.recordset;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  updateUserRole,
  getAllRoles,
  getAllUsers,
  hashPassword,
  comparePassword,
  generateToken
};
