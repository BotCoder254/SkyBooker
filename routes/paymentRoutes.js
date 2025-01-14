const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes
router.use(protect);
router.post('/initiate', paymentController.initiatePayment);
router.get('/status/:bookingId', paymentController.queryPaymentStatus);

// Public route for M-Pesa callback
router.post('/callback', paymentController.handlePaymentCallback);

module.exports = router; 