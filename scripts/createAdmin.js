require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Admin user details
const adminUser = {
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '+1234567890',
    password: 'Admin@123',
    role: 'admin',
    status: 'active'
};

async function createAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminUser.email });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminUser.password, salt);

        // Create admin user
        const admin = await User.create({
            ...adminUser,
            password: hashedPassword
        });

        console.log('Admin user created successfully:');
        console.log({
            name: admin.name,
            email: admin.email,
            role: admin.role
        });
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createAdminUser();
