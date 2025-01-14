const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    passportNumber: {
        type: String,
        required: true,
        trim: true
    }
});

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    flight: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        required: true
    },
    passengers: [passengerSchema],
    totalAmount: {
        type: Number,
        required: true
    },
    seatNumbers: [{
        type: String,
        required: true
    }],
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    payment: {
        mpesaReceiptNumber: String,
        checkoutRequestID: String,
        amount: Number,
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending'
        },
        phoneNumber: String,
        transactionDate: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for faster queries
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ flight: 1 });
bookingSchema.index({ 'payment.mpesaReceiptNumber': 1 });
bookingSchema.index({ 'payment.checkoutRequestID': 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking; 