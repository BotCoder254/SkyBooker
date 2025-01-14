const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        // Find user by email
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if user is blocked
        if (user.status === 'blocked') {
            return done(null, false, { message: 'Your account has been blocked. Please contact support.' });
        }

        // Remove password from user object
        user.password = undefined;
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;