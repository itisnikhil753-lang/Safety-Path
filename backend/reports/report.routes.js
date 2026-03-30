const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all reports (can be filtered by user context later)
router.get('/', verifyToken, reportController.getAllReports);

// Get a specific report by id
router.get('/:id', verifyToken, reportController.getReport);

// Submit a new incident report
router.post('/', verifyToken, reportController.createReport);

// Get official stats from data.gov.in
router.get('/external-stats', verifyToken, reportController.getExternalCrimeStats);

// Get real-time reports summary
router.get('/summary', verifyToken, reportController.getReportsSummary);

module.exports = router;
