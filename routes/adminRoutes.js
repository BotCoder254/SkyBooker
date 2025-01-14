const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);
router.use(isAdmin);

// Dashboard routes
router.get('/', adminController.getDashboardStats);
router.get('/dashboard', adminController.getDashboardStats);

// Flight management routes
router.get('/flights', adminController.getAllFlights);
router.get('/flights/create', (req, res) => {
    res.render('admin/flights', { 
        title: 'Create Flight',
        path: '/admin/flights/create',
        user: req.user
    });
});
router.post('/flights', adminController.addFlight);
router.route('/flights/:id')
    .put(adminController.updateFlight)
    .delete(adminController.deleteFlight);

// Booking management routes
router.get('/bookings', adminController.getAllBookings);
router.put('/bookings/:id/status', adminController.updateBookingStatus);

// User management routes
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/reset-password', adminController.resetUserPassword);

module.exports = router;