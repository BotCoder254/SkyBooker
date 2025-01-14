const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Helper function to create JWT token
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// Helper function to handle errors
const handleError = (err) => {
    let errors = {};

    // Duplicate email error
    if (err.code === 11000) {
        errors.email = 'Email already exists';
        return errors;
    }

    // Validation errors
    if (err.message.includes('validation failed')) {
        Object.values(err.errors).forEach(({ properties }) => {
            errors[properties.path] = properties.message;
        });
    }

    return errors;
};

// Helper function to send token response with redirect
const sendTokenResponse = (user, statusCode, res) => {
    const token = createToken(user._id);

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    // Remove password from output
    user.password = undefined;

    // Determine redirect URL based on user role
    const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/dashboard';

    // Set the cookie
    res.cookie('jwt', token, cookieOptions);

    // Send response with redirect URL
    res.status(statusCode).json({
        status: 'success',
        message: 'Login successful',
        redirect: redirectUrl
    });
};

// Register user
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide all required fields'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'Email already registered'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            phone,
            password,
            status: 'active',
            role: 'user'
        });

        // Log the user in
        req.login(user, (err) => {
            if (err) {
                console.error('Login error after registration:', err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Registration successful but error logging in'
                });
            }
            sendTokenResponse(user, 201, res);
        });
    } catch (err) {
        const errors = handleError(err);
        res.status(400).json({ status: 'error', errors });
    }
};

// Login user
exports.login = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
        }

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: info.message || 'Invalid credentials'
            });
        }

        // Check if user is blocked
        if (user.status === 'blocked') {
            return res.status(403).json({
                status: 'error',
                message: 'Your account has been blocked. Please contact support.'
            });
        }

        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Internal server error'
                });
            }

            sendTokenResponse(user, 200, res);
        });
    })(req, res, next);
};

// Logout user
exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Error during logout'
            });
        }
        res.cookie('jwt', 'loggedout', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true
        });
        res.status(200).json({ 
            status: 'success',
            message: 'Logged out successfully',
            redirect: '/login'
        });
    });
};

// Get current user
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Error fetching user data'
        });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        // Find user and update
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, email, phone },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            data: user
        });
    } catch (err) {
        const errors = handleError(err);
        res.status(400).json({
            status: 'error',
            errors
        });
    }
};

// Update password
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get user
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                status: 'error',
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: 'Error updating password'
        });
    }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Get user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'No user found with that email'
            });
        }

        // Generate reset token
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // Create reset URL
        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

        // Send email
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            message: `You requested a password reset. Please go to this link to reset your password: ${resetURL}\nIf you didn't request this, please ignore this email.`
        });

        res.status(200).json({
            status: 'success',
            message: 'Password reset link sent to email'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Error sending password reset email'
        });
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Get user based on token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Token is invalid or has expired'
            });
        }

        // Update password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: 'Error resetting password'
        });
    }
};