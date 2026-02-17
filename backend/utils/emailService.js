const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otp) {
  try {
    console.log('Attempting to send OTP to:', email);
    console.log('Resend API key:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');

    console.log('Sending OTP email via Resend...');
    
    const result = await resend.emails.send({
      from: 'Ecofy <onboarding@resend.dev>',
      to: email,
      subject: 'Ecofy - Password Reset OTP',
      html: `
        <h2>Password Reset Request</h2>
        <p>Your OTP for password reset is:</p>
        <h1 style="letter-spacing: 5px; font-weight: bold;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return false;
    }

    console.log('Email sent successfully to:', email);
    console.log('Email ID:', result.data?.id);
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
