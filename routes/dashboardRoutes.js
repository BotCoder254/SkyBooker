const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');

// Get dashboard statistics
router.get('/stats', isAuthenticated, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get total bookings in last 30 days
        const totalBookings = await Booking.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Get total revenue in last 30 days
        const bookings = await Booking.find({
            createdAt: { $gte: thirtyDaysAgo }
        });
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

        // Get active flights
        const activeFlights = await Flight.countDocuments({
            departureDate: { $gte: new Date() }
        });

        // Calculate average satisfaction (mock data for now)
        const satisfaction = 4.5;

        // Get booking trends (last 7 days)
        const bookingTrends = await getBookingTrends();

        // Get revenue trends (last 7 days)
        const revenueTrends = await getRevenueTrends();

        // Get recent bookings
        const recentBookings = await getRecentBookings();

        res.json({
            totalBookings,
            totalRevenue,
            activeFlights,
            satisfaction,
            bookingTrends,
            revenueTrends,
            recentBookings
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
});

// Helper function to get booking trends
async function getBookingTrends() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const bookings = await Booking.aggregate([
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

    // Fill in missing dates with zero bookings
    const trends = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const booking = bookings.find(b => b._id === dateStr);
        trends.unshift({
            date: dateStr,
            count: booking ? booking.count : 0
        });
    }

    return trends;
}

// Helper function to get revenue trends
async function getRevenueTrends() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const revenues = await Booking.aggregate([
        {
            $match: {
                createdAt: { $gte: sevenDaysAgo }
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

    // Fill in missing dates with zero revenue
    const trends = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const revenue = revenues.find(r => r._id === dateStr);
        trends.unshift({
            date: dateStr,
            amount: revenue ? revenue.amount : 0
        });
    }

    return trends;
}

// Helper function to get recent bookings
async function getRecentBookings() {
    return await Booking.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name')
        .populate('flight', 'flightNumber')
        .lean()
        .then(bookings => bookings.map(booking => ({
            bookingId: booking._id,
            customerName: booking.user.name,
            flightNumber: booking.flight.flightNumber,
            status: booking.status,
            amount: booking.totalAmount
        })));
}

module.exports = router;
