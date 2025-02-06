const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const User = require('../models/User');

// Protect all routes
router.use(protect);
router.use(isAdmin);

// Dashboard routes
router.get('/', adminController.getDashboardStats);
router.get('/dashboard', adminController.getDashboardStats);

// API routes
router.get('/api/dashboard/stats', async (req, res) => {
    try {
        const stats = await adminController.getDashboardStats();
        
        // Get booking and revenue trends
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const bookingTrends = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const revenueTrends = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                    status: 'confirmed',
                    'payment.status': 'completed'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    amount: { $sum: "$totalAmount" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Fill in missing dates
        const trends = {
            bookingTrends: [],
            revenueTrends: []
        };

        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const booking = bookingTrends.find(b => b._id === dateStr);
            const revenue = revenueTrends.find(r => r._id === dateStr);
            
            trends.bookingTrends.unshift({
                date: dateStr,
                count: booking ? booking.count : 0
            });
            
            trends.revenueTrends.unshift({
                date: dateStr,
                amount: revenue ? revenue.amount : 0
            });
        }

        // Get recent activity
        const recentActivity = await Promise.all([
            // Recent bookings
            Booking.find()
                .sort({ createdAt: -1 })
                .limit(3)
                .populate('user', 'name')
                .populate('flight', 'flightNumber')
                .lean(),
            // Recent flights
            Flight.find()
                .sort({ createdAt: -1 })
                .limit(3)
                .lean(),
            // Recent users
            User.find()
                .sort({ createdAt: -1 })
                .limit(3)
                .select('name email createdAt')
                .lean()
        ]);

        const activity = [
            ...recentActivity[0].map(booking => ({
                type: 'booking',
                title: `New booking by ${booking.user.name}`,
                subtitle: `Flight ${booking.flight.flightNumber}`,
                time: booking.createdAt
            })),
            ...recentActivity[1].map(flight => ({
                type: 'flight',
                title: `New flight added`,
                subtitle: `${flight.departureCity} to ${flight.arrivalCity}`,
                time: flight.createdAt
            })),
            ...recentActivity[2].map(user => ({
                type: 'user',
                title: `New user registered`,
                subtitle: user.name,
                time: user.createdAt
            }))
        ].sort((a, b) => b.time - a.time).slice(0, 5);

        res.json({
            ...stats,
            ...trends,
            recentActivity: activity
        });
    } catch (error) {
        console.error('Error fetching admin dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
});

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