const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
    flightNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    airline: {
        type: String,
        required: true,
        trim: true
    },
    departureCity: {
        type: String,
        required: true,
        trim: true
    },
    arrivalCity: {
        type: String,
        required: true,
        trim: true
    },
    departureTime: {
        type: Date,
        required: true
    },
    arrivalTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    seatsAvailable: {
        type: Number,
        required: true,
        min: 0
    },
    aircraft: {
        type: String,
        required: true
    },
    class: {
        type: String,
        enum: ['economy', 'business', 'first'],
        default: 'economy'
    },
    status: {
        type: String,
        enum: ['scheduled', 'delayed', 'cancelled', 'completed'],
        default: 'scheduled'
    },
    pilot: {
        name: {
            type: String,
            required: [true, 'Pilot name is required']
        },
        licenseNumber: {
            type: String,
            required: [true, 'Pilot license number is required']
        },
        experience: {
            type: Number, // in years
            required: [true, 'Pilot experience is required']
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 5
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for faster searches
flightSchema.index({ departureCity: 1, arrivalCity: 1 });
flightSchema.index({ departureTime: 1 });
flightSchema.index({ price: 1 });
flightSchema.index({ airline: 1 });
flightSchema.index({ status: 1 });

// Virtual for formatted duration
flightSchema.virtual('formattedDuration').get(function() {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    return `${hours}h ${minutes}m`;
});

const Flight = mongoose.model('Flight', flightSchema);

module.exports = Flight; 