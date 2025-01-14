const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = 'public/uploads/flights';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        cb(null, `flight-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
}).array('images', 5); // Allow up to 5 images

// Get dashboard statistics
exports.getDashboardStats = async () => {
    try {
        const stats = await Promise.all([
            // Revenue statistics
            Booking.aggregate([
                {
                    $match: {
                        status: 'confirmed',
                        'payment.status': 'completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        averageBookingValue: { $avg: '$totalAmount' }
                    }
                }
            ]),
            // Booking statistics
            Booking.aggregate([
                {
                    $group: {
                        _id: null,
                        totalBookings: { $sum: 1 },
                        confirmedBookings: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            // Flight statistics
            Flight.aggregate([
                {
                    $group: {
                        _id: null,
                        totalFlights: { $sum: 1 },
                        activeFlights: {
                            $sum: {
                                $cond: [
                                    { $gt: ['$departureDate', new Date()] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            // User statistics
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsers: { $sum: 1 },
                        activeUsers: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                            }
                        }
                    }
                }
            ])
        ]);

        return {
            revenue: stats[0][0] || { totalRevenue: 0, averageBookingValue: 0 },
            bookings: stats[1][0] || { totalBookings: 0, confirmedBookings: 0 },
            flights: stats[2][0] || { totalFlights: 0, activeFlights: 0 },
            users: stats[3][0] || { totalUsers: 0, activeUsers: 0 }
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        throw error;
    }
};

// @desc    Get create flight page
// @route   GET /admin/flights/create
// @access  Private/Admin
exports.getCreateFlightPage = async (req, res) => {
    try {
        res.render('admin/create-flight', {
            title: 'Create New Flight',
            user: req.user,
            path: '/admin/flights/create',
            layout: 'layouts/admin'
        });
    } catch (error) {
        console.error('Error rendering create flight page:', error);
        res.status(500).render('500', {
            title: 'Server Error',
            user: req.user,
            layout: 'layouts/admin'
        });
    }
};

// Add new flight
exports.addFlight = async (req, res) => {
    try {
        upload(req, res, async function(err) {
            if (err) {
                return res.status(400).json({
                    status: 'error',
                    message: err.message
                });
            }

            const flightData = { ...req.body };
            
            // Handle multiple images
            if (req.files && req.files.length > 0) {
                flightData.images = req.files.map(file => `/uploads/flights/${file.filename}`);
                flightData.logo = flightData.images[0]; // Use first image as logo
            }

            const flight = await Flight.create(flightData);

            res.status(201).json({
                status: 'success',
                data: { flight }
            });
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Update flight
exports.updateFlight = async (req, res) => {
    try {
        upload(req, res, async function(err) {
            if (err) {
                return res.status(400).json({
                    status: 'error',
                    message: err.message
                });
            }

            const flight = await Flight.findById(req.params.id);
            if (!flight) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Flight not found'
                });
            }

            const updateData = { ...req.body };

            // Handle multiple images
            if (req.files && req.files.length > 0) {
                // Delete old images
                if (flight.images) {
                    flight.images.forEach(image => {
                        const filePath = path.join(__dirname, '..', 'public', image);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    });
                }

                updateData.images = req.files.map(file => `/uploads/flights/${file.filename}`);
                updateData.logo = updateData.images[0]; // Use first image as logo
            }

            const updatedFlight = await Flight.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );

            res.status(200).json({
                status: 'success',
                data: { flight: updatedFlight }
            });
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Delete flight
exports.deleteFlight = async (req, res) => {
    try {
        const flight = await Flight.findById(req.params.id);
        if (!flight) {
            return res.status(404).json({
                status: 'error',
                message: 'Flight not found'
            });
        }

        // Delete associated images
        if (flight.images) {
            flight.images.forEach(image => {
                const filePath = path.join(__dirname, '..', 'public', image);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        await flight.remove();

        res.status(200).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get all flights for admin
exports.getAllFlights = async (req, res) => {
    try {
        const { search, status, date, sort } = req.query;
        let query = {};

        // Search filter
        if (search) {
            query.$or = [
                { flightNumber: new RegExp(search, 'i') },
                { departureCity: new RegExp(search, 'i') },
                { arrivalCity: new RegExp(search, 'i') },
                { airline: new RegExp(search, 'i') }
            ];
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        // Date filter
        if (date) {
            const selectedDate = new Date(date);
            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            
            query.departureTime = {
                $gte: selectedDate,
                $lt: nextDate
            };
        }

        // Sort options
        let sortOption = {};
        switch (sort) {
            case 'departureTime':
                sortOption = { departureTime: 1 };
                break;
            case 'flightNumber':
                sortOption = { flightNumber: 1 };
                break;
            case 'price':
                sortOption = { price: 1 };
                break;
            default:
                sortOption = { departureTime: 1 };
        }

        const flights = await Flight.find(query)
            .sort(sortOption)
            .limit(50);

        res.status(200).json({
            status: 'success',
            results: flights.length,
            data: { flights }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get all bookings for admin with filters
exports.getAllBookings = async (req, res) => {
    try {
        const { search, date, status } = req.query;
        let query = {};

        // Search filter
        if (search) {
            const users = await User.find({ 
                $or: [
                    { name: new RegExp(search, 'i') },
                    { email: new RegExp(search, 'i') }
                ]
            });
            const userIds = users.map(user => user._id);

            const flights = await Flight.find({
                $or: [
                    { flightNumber: new RegExp(search, 'i') }
                ]
            });
            const flightIds = flights.map(flight => flight._id);

            query.$or = [
                { user: { $in: userIds } },
                { flight: { $in: flightIds } }
            ];
        }

        // Date filter
        if (date) {
            const selectedDate = new Date(date);
            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            
            query.createdAt = {
                $gte: selectedDate,
                $lt: nextDate
            };
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        const bookings = await Booking.find(query)
            .populate('user', 'name email phone')
            .populate('flight')
            .sort('-createdAt');

        res.status(200).json({
            status: 'success',
            results: bookings.length,
            data: { bookings }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid booking status'
            });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }

        // If cancelling or completing, update flight seats
        if ((status === 'cancelled' || status === 'completed') && booking.status === 'confirmed') {
            const flight = await Flight.findById(booking.flight);
            if (flight) {
                flight.seatsAvailable += booking.passengers.length;
                await flight.save();
            }
        }

        booking.status = status;
        await booking.save();

        res.status(200).json({
            status: 'success',
            data: { booking }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get all users for admin with filters
exports.getAllUsers = async (req, res) => {
    try {
        const { search, status, role } = req.query;
        let query = {};

        // Search filter
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone: new RegExp(search, 'i') }
            ];
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        // Role filter
        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .select('-password')
            .sort('-createdAt');

        res.status(200).json({
            status: 'success',
            results: users.length,
            data: { users }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid user status'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Reset user password
exports.resetUserPassword = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Generate a random password
        const newPassword = Math.random().toString(36).slice(-8);
        
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            status: 'success',
            data: { 
                message: 'Password reset successful',
                newPassword // In production, send this via email instead
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Update user role
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid role'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
}; 