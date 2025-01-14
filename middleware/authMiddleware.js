const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
    try {
        // Check if user is authenticated via Passport
        if (req.isAuthenticated()) {
            return next();
        }

        // If not authenticated via Passport, check JWT
        let token;
        
        if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.redirect('/login');
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.redirect('/login');
            }

            // Check if user is blocked
            if (user.status === 'blocked') {
                res.cookie('jwt', '', { maxAge: 1 });
                return res.redirect('/login');
            }

            // Add user to request
            req.user = user;
            res.locals.user = user;
            next();
        } catch (error) {
            return res.redirect('/login');
        }
    } catch (error) {
        next(error);
    }
};

// Check if user is authenticated
exports.isAuthenticated = async (req, res, next) => {
    try {
        // Check if user is authenticated via Passport
        if (req.isAuthenticated()) {
            res.locals.user = req.user;
            
            // Redirect authenticated users from auth pages to dashboard
            if (req.path === '/' || req.path === '/login' || req.path === '/register') {
                return res.redirect('/dashboard');
            }
            return next();
        }

        // If not authenticated via Passport, check JWT
        const token = req.cookies.jwt;
        
        if (!token) {
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user || user.status === 'blocked') {
                res.cookie('jwt', '', { maxAge: 1 });
                return next();
            }

            req.user = user;
            res.locals.user = user;
            
            // Redirect authenticated users from auth pages to dashboard
            if (req.path === '/' || req.path === '/login' || req.path === '/register') {
                return res.redirect('/dashboard');
            }
        } catch (error) {
            return next();
        }
        next();
    } catch (error) {
        next(error);
    }
};

// Admin middleware
exports.isAdmin = async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('403', {
            title: '403 - Access Denied',
            path: req.path,
            user: req.user,
            message: 'Access denied. Admin privileges required.'
        });
    }
}; 