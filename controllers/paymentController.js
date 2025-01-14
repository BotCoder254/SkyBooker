const Booking = require('../models/Booking');
const mpesaService = require('../services/mpesaService');

// Initiate payment
exports.initiatePayment = async (req, res) => {
    try {
        const { bookingId, phoneNumber } = req.body;

        // Get booking details
        const booking = await Booking.findById(bookingId);
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
                message: 'Not authorized to make payment for this booking'
            });
        }

        // Initiate M-Pesa payment
        const stkPushResponse = await mpesaService.initiateSTKPush(
            phoneNumber,
            booking.totalAmount,
            booking._id.toString()
        );

        // Update booking with payment details
        booking.payment = {
            checkoutRequestID: stkPushResponse.CheckoutRequestID,
            amount: booking.totalAmount,
            phoneNumber,
            status: 'pending'
        };
        await booking.save();

        res.status(200).json({
            status: 'success',
            data: {
                checkoutRequestID: stkPushResponse.CheckoutRequestID,
                merchantRequestID: stkPushResponse.MerchantRequestID
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Query payment status
exports.queryPaymentStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking || !booking.payment.checkoutRequestID) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking or payment not found'
            });
        }

        // Check if booking belongs to user
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to view payment status for this booking'
            });
        }

        const statusResponse = await mpesaService.queryTransactionStatus(
            booking.payment.checkoutRequestID
        );

        res.status(200).json({
            status: 'success',
            data: statusResponse
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Handle M-Pesa callback
exports.handlePaymentCallback = async (req, res) => {
    try {
        const callbackData = mpesaService.processCallback(req.body);

        if (callbackData.success) {
            // Find booking by AccountReference (booking ID)
            const booking = await Booking.findOne({
                'payment.checkoutRequestID': callbackData.checkoutRequestID
            });

            if (booking) {
                // Update booking payment status
                booking.payment = {
                    ...booking.payment,
                    mpesaReceiptNumber: callbackData.mpesaReceiptNumber,
                    status: 'completed',
                    transactionDate: new Date(callbackData.transactionDate)
                };
                booking.status = 'confirmed';
                await booking.save();
            }
        }

        res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    } catch (error) {
        console.error('Payment callback error:', error);
        res.status(200).json({ ResultCode: 1, ResultDesc: "Failed" });
    }
}; 