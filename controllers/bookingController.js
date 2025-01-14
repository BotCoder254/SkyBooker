const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const mpesaService = require('../services/mpesaService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create a new booking
exports.createBooking = async (req, res) => {
    try {
        const { flightId, passengers, seatNumbers } = req.body;

        // Get flight details
        const flight = await Flight.findById(flightId);
        if (!flight) {
            return res.status(404).json({
                status: 'error',
                message: 'Flight not found'
            });
        }

        // Check seat availability
        if (flight.seatsAvailable < passengers.length) {
            return res.status(400).json({
                status: 'error',
                message: 'Not enough seats available'
            });
        }

        // Calculate total amount
        const totalAmount = flight.price * passengers.length;

        // Create booking
        const booking = await Booking.create({
            user: req.user._id,
            flight: flightId,
            passengers,
            seatNumbers,
            totalAmount,
            status: 'pending'
        });

        // Update flight seats
        flight.seatsAvailable -= passengers.length;
        await flight.save();

        res.status(201).json({
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

// Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }

        // Check if booking belongs to user
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to cancel this booking'
            });
        }

        // Check if booking can be cancelled (24 hours before departure)
        const flight = await Flight.findById(booking.flight);
        const now = new Date();
        const departureTime = new Date(flight.departureTime);
        const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

        if (hoursUntilDeparture < 24) {
            return res.status(400).json({
                status: 'error',
                message: 'Bookings can only be cancelled at least 24 hours before departure'
            });
        }

        // Update booking status
        booking.status = 'cancelled';
        await booking.save();

        // Update flight seats
        flight.seatsAvailable += booking.passengers.length;
        await flight.save();

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

// Generate ticket PDF
exports.generateTicket = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('flight')
            .populate('user', 'name email');

        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }

        // Check if booking belongs to user
        if (booking.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to access this ticket'
            });
        }

        // Create PDF document
        const doc = new PDFDocument();
        const filename = `ticket-${booking._id}.pdf`;
        const filepath = path.join(__dirname, '..', 'public', 'tickets', filename);

        // Pipe PDF to file
        doc.pipe(fs.createWriteStream(filepath));

        // Add content to PDF
        doc.fontSize(25).text('Flight Ticket', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12);
        doc.text(`Booking Reference: ${booking._id}`);
        doc.text(`Flight Number: ${booking.flight.flightNumber}`);
        doc.text(`From: ${booking.flight.departureCity}`);
        doc.text(`To: ${booking.flight.arrivalCity}`);
        doc.text(`Date: ${new Date(booking.flight.departureTime).toLocaleString()}`);
        doc.moveDown();

        // Add passenger details
        doc.fontSize(14).text('Passenger Details');
        booking.passengers.forEach((passenger, index) => {
            doc.fontSize(12).text(`
                Passenger ${index + 1}:
                Name: ${passenger.firstName} ${passenger.lastName}
                Seat: ${booking.seatNumbers[index]}
                Passport: ${passenger.passportNumber}
            `);
        });

        // Add barcode or QR code here if needed

        // Finalize PDF
        doc.end();

        // Send file URL in response
        const ticketUrl = `/tickets/${filename}`;
        res.status(200).json({
            status: 'success',
            data: { ticketUrl }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get user's bookings
exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
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

// Get booking details
exports.getBookingDetails = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('flight')
            .populate('user', 'name email phone');

        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }

        // Check if booking belongs to user
        if (booking.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to view this booking'
            });
        }

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