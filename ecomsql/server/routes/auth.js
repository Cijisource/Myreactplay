const express = require('express');
const { body, validationResult } = require('express-validator');
const userService = require('../services/userService');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Register endpoint
router.post('/register', [
  body('userName').notEmpty().trim(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userName, password, name } = req.body;

    const user = await userService.registerUser(userName, password, name);

    res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', [
  body('userName').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userName, password } = req.body;
    console.log('[AUTH ROUTE] Login attempt for user:', userName);

    const result = await userService.loginUser(userName, password);
    console.log('[AUTH ROUTE] Login successful, returning response');

    res.json(result);
  } catch (error) {
    console.error('[AUTH ROUTE] Login error:', error.message);
    console.error('[AUTH ROUTE] Full error:', error);
    
    if (error.message === 'Invalid username or password') {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.userId);
    
    res.json({
      id: user.Id,
      userName: user.UserName,
      name: user.Name,
      role: user.RoleName,
      roleType: user.RoleType,
      createdDate: user.CreatedDate,
      lastLogin: user.LastLogin
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Get all roles (Admin only)
router.get('/roles', verifyToken, isAdmin, async (req, res) => {
  try {
    const roles = await userService.getAllRoles();
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// Update user role (Admin only)
router.put('/users/:userId/role', verifyToken, isAdmin, [
  body('roleId').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { roleId } = req.body;

    const result = await userService.updateUserRole(parseInt(userId), roleId);

    res.json({
      message: 'User role updated successfully',
      result
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get all users with their roles (Admin only)
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({
      totalUsers: users.length,
      users: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Get user by ID with role info (Admin only or own profile)
router.get('/users/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.roleType;
    
    // Allow access if admin or if requesting own profile
    if (requestingUserRole !== 'Administrator' && parseInt(userId) !== requestingUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await userService.getUserById(parseInt(userId));
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Debug endpoint to check database users (remove in production)
router.get('/debug/users', async (req, res) => {
  try {
    const { getConnection, sql } = require('../config');
    const pool = await getConnection();
    
    const result = await pool.request().query(`
      SELECT u.Id, u.UserName, u.Name, u.CreatedDate, 
             rd.RoleType, rd.RoleName
      FROM [User] u
      LEFT JOIN UserRole ur ON u.Id = ur.UserId
      LEFT JOIN RoleDetail rd ON ur.RoleId = rd.Id
      ORDER BY u.CreatedDate DESC
    `);
    
    res.json({
      totalUsers: result.recordset.length,
      users: result.recordset
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch debug info', details: error.message });
  }
});

// Debug endpoint to check roles
router.get('/debug/roles', async (req, res) => {
  try {
    const { getConnection, sql } = require('../config');
    const pool = await getConnection();
    
    const result = await pool.request().query(`
      SELECT * FROM RoleDetail ORDER BY RoleType
    `);
    
    res.json({
      totalRoles: result.recordset.length,
      roles: result.recordset
    });
  } catch (error) {
    console.error('Debug roles endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
  }
});

module.exports = router;
