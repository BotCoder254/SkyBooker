const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// Flight routes
router.get('/', flightController.searchFlights);
router.get('/stats', flightController.getFlightStats);
router.get('/:id', flightController.getFlightDetails);

module.exports = router; 