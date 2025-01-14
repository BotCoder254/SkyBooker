const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// Booking routes
router.post('/', bookingController.createBooking);
router.get('/my-bookings', bookingController.getUserBookings);
router.get('/:id', bookingController.getBookingDetails);
router.post('/:id/cancel', bookingController.cancelBooking);
router.get('/:id/ticket', bookingController.generateTicket);

module.exports = router; 