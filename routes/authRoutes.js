const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    register,
    login,
    logout,
    getMe,
    updateProfile,
    updatePassword,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.post('/logout', logout);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

module.exports = router;