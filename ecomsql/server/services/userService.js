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
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  if (!process.env.JWT_SECRET) {
    console.warn('[generateToken] WARNING: JWT_SECRET not set in environment, using fallback');
  }
  
  const token = jwt.sign(
    {
      userId: user.Id,
      userName: user.UserName,
      name: user.Name,
      roleType: user.RoleType,
      roleId: user.RoleId
    },
    secret,
    { expiresIn: '24h' }
  );
  return token;
}

// Register a new user using email
async function registerUser(email, password, name, roleType) {
  try {
    const pool = await getConnection();
    console.log('[REGISTER] Starting registration for email:', email);
    console.log('[REGISTER] Requested role:', roleType);
    
    // Check if user already exists (email stored in UserName field)
    const existingUser = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM [User] WHERE UserName = @email');

    if (existingUser.recordset.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    console.log('[REGISTER] Hashing password...');
    const hashedPassword = await hashPassword(password);
    console.log('[REGISTER] Password hashed successfully. Length:', hashedPassword?.length);

    // Insert new user with email as UserName
    const result = await pool.request()
      .input('email', sql.NVarChar, email)      // Email stored in UserName field
      .input('password', sql.NVarChar, hashedPassword)
      .input('name', sql.NVarChar, name)
      .input('createdDate', sql.DateTime2, new Date())
      .query(`
        INSERT INTO [User] (UserName, Password, Name, CreatedDate)
        VALUES (@email, @password, @name, @createdDate)
        SELECT SCOPE_IDENTITY() as Id
      `);

    console.log('[REGISTER] User inserted with ID:', result.recordset[0].Id);
    const userId = result.recordset[0].Id;

    // Assign role (default to Customer, but allow Seller on signup)
    // First, find the requested role
    const roleResult = await pool.request()
      .input('roleType', sql.NVarChar, roleType)
      .query('SELECT Id FROM RoleDetail WHERE RoleType = @roleType');

    if (roleResult.recordset.length > 0) {
      const roleId = roleResult.recordset[0].Id;
      console.log('[REGISTER] Assigning', roleType, 'role (ID:', roleId, ') to user');
      
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('roleId', sql.Int, roleId)
        .input('createdDate', sql.DateTime2, new Date())
        .query(`
          INSERT INTO UserRole (UserId, RoleId, CreatedDate)
          VALUES (@userId, @roleId, @createdDate)
        `);
      console.log('[REGISTER] Role assigned successfully. User email:', email);
    } else {
      console.warn('[REGISTER] Requested role "' + roleType + '" not found in RoleDetail table. Using Customer role.');
      
      // Fallback to Customer role
      const customerRoleResult = await pool.request()
        .input('roleType', sql.NVarChar, 'Customer')
        .query('SELECT Id FROM RoleDetail WHERE RoleType = @roleType');
      
      if (customerRoleResult.recordset.length > 0) {
        const roleId = customerRoleResult.recordset[0].Id;
        await pool.request()
          .input('userId', sql.Int, userId)
          .input('roleId', sql.Int, roleId)
          .input('createdDate', sql.DateTime2, new Date())
          .query(`
            INSERT INTO UserRole (UserId, RoleId, CreatedDate)
            VALUES (@userId, @roleId, @createdDate)
          `);
      }
    }

    console.log('[REGISTER] Registration complete for user:', email);
    return { userId, email, name };
  } catch (error) {
    console.error('[REGISTER] Registration error:', error.message);
    throw error;
  }
}

// Login user
async function loginUser(email, password) {
  try {
    const pool = await getConnection();
    console.log('[LOGIN] Database connection established for loginUser');
    console.log('[LOGIN] Attempting to find user with email:', email);
    console.log('[LOGIN] Password provided:', password ? 'Yes' : 'No');

    // Get user with role information using email (stored in UserName field)
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
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
        WHERE u.UserName = @email
      `);

    console.log('[LOGIN] Query result received. Records found:', result.recordset ? result.recordset.length : 0);

    if (!result || !result.recordset || result.recordset.length === 0) {
      console.log('[LOGIN] User not found with email:', email);
      throw new Error('Invalid email or password');
    }

    const user = result.recordset[0];
    console.log('[LOGIN] User found:', { id: user.Id, email: user.UserName, name: user.Name });

    // Compare password
    console.log('[LOGIN] Validating password...');
    const isPasswordValid = await comparePassword(password, user.Password);
    console.log('[LOGIN] Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('[LOGIN] Password invalid for user:', email);
      throw new Error('Invalid email or password');
    }

    // Update last login
    await pool.request()
      .input('userId', sql.Int, user.Id)
      .input('lastLogin', sql.DateTime2, new Date())
      .query('UPDATE [User] SET LastLogin = @lastLogin WHERE Id = @userId');

    console.log('[LOGIN] Last login updated for user:', email);

    // Generate token
    const token = generateToken(user);
    console.log('[LOGIN] Token generated successfully');

    const loginResponse = {
      token,
      user: {
        id: user.Id,
        userName: user.UserName,
        email: user.UserName,
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
