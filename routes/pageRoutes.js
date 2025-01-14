const express = require('express');
const router = express.Router();
const { protect, isAuthenticated, isAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// Public routes
router.get('/', isAuthenticated, (req, res) => {
    res.render('index', { 
        title: 'Home',
        path: '/',
        user: req.user
    });
});

router.get('/login', isAuthenticated, (req, res) => {
    res.render('login', { 
        title: 'Login',
        path: '/login',
        user: req.user
    });
});

router.get('/register', isAuthenticated, (req, res) => {
    res.render('register', { 
        title: 'Register',
        path: '/register',
        user: req.user
    });
});

router.get('/forgot-password', isAuthenticated, (req, res) => {
    res.render('forgot-password', { 
        title: 'Forgot Password',
        path: '/forgot-password',
        user: req.user
    });
});

// Protected routes
router.get('/dashboard', protect, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // Redirect admin to admin dashboard
            res.redirect('/admin/dashboard');
        } else {
            // For regular users, render user dashboard
            res.render('dashboard', { 
                title: 'Dashboard',
                path: '/dashboard',
                user: req.user
            });
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('500', {
            title: '500 - Server Error',
            path: req.path,
            user: req.user
        });
    }
});

router.get('/flights', protect, (req, res) => {
    res.render('flights', { 
        title: 'Flights',
        path: '/flights',
        user: req.user
    });
});

router.get('/bookings', protect, (req, res) => {
    res.render('my-bookings', { 
        title: 'My Bookings',
        path: '/bookings',
        user: req.user
    });
});

router.get('/bookings/:id', protect, (req, res) => {
    res.render('booking-details', { 
        title: 'Booking Details',
        path: '/bookings',
        user: req.user
    });
});

// Admin routes
router.get('/admin', protect, isAdmin, (req, res) => {
    res.redirect('/admin/dashboard');
});

router.get('/admin/dashboard', protect, isAdmin, async (req, res) => {
    try {
        const stats = await adminController.getDashboardStats();
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            path: '/admin/dashboard',
            user: req.user,
            stats: stats
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.status(500).render('500', {
            title: '500 - Server Error',
            path: req.path,
            user: req.user
        });
    }
});

router.get('/admin/flights', protect, isAdmin, (req, res) => {
    res.render('admin/flights', {
        title: 'Manage Flights',
        path: '/admin/flights',
        user: req.user
    });
});

router.get('/admin/bookings', protect, isAdmin, (req, res) => {
    res.render('admin/bookings', {
        title: 'Manage Bookings',
        path: '/admin/bookings',
        user: req.user
    });
});

router.get('/admin/users', protect, isAdmin, (req, res) => {
    res.render('admin/users', {
        title: 'Manage Users',
        path: '/admin/users',
        user: req.user
    });
});

// Profile route
router.get('/profile', protect, (req, res) => {
    res.render('profile', {
        title: 'Profile',
        path: '/profile',
        user: req.user
    });
});

// Error pages
router.get('/404', (req, res) => {
    res.render('404', { 
        title: 'Page Not Found',
        path: '/404',
        user: req.user || null
    });
});

// Catch all route for 404
router.get('*', (req, res) => {
    res.status(404).render('404', { 
        title: 'Page Not Found',
        path: req.path,
        user: req.user || null
    });
});

module.exports = router; 