const express = require('express');
const router = express.Router();
const volunteerController = require('./volunteer.controller');
const { verifyToken } = require('../middleware/authMiddleware');

// Get volunteer status
router.get('/status', verifyToken, volunteerController.getStatus);

// Submit a volunteer application
router.post('/apply', verifyToken, volunteerController.applyAsVolunteer);

// Update volunteer status (e.g., active/inactive)
router.patch('/toggle-status', verifyToken, volunteerController.toggleDutyStatus);

module.exports = router;
