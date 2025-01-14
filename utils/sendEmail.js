const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
        port: process.env.EMAIL_PORT || 2525,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // Define email options
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@flightbooking.com',
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    // Send email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
