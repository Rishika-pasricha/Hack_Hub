const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS instead of SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otp) {
  try {
    console.log('Attempting to send OTP to:', email);
    console.log('Gmail user:', process.env.GMAIL_USER ? 'SET' : 'NOT SET');
    console.log('Gmail password:', process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET');

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Ecofy - Password Reset OTP',
      html: `
        <h2>Password Reset Request</h2>
        <p>Your OTP for password reset is:</p>
        <h1 style="letter-spacing: 5px; font-weight: bold;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    console.log('Sending email...');
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', email);
    return true;
  } catch (err) {
    console.error('Error sending email:', err.message);
    console.error('Full error:', err);
    return false;
  }
}

module.exports = {
  generateOTP,
  sendOTPEmail
};
