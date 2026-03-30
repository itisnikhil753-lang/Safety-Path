const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { verifyToken } = require('../middleware/authMiddleware');

// Get current user profile
router.get('/profile', verifyToken, userController.getProfile);

// Update user profile
router.put('/profile', verifyToken, userController.updateProfile);

module.exports = router;
