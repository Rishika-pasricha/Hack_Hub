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

async function sendIssueCompletionEmail(userEmail, issueSubject, issueDescription, municipalityName, adminName) {
  try {
    console.log('Attempting to send issue completion email to:', userEmail);

    const result = await resend.emails.send({
      from: 'Ecofy <onboarding@resend.dev>',
      to: userEmail,
      subject: `Issue Resolution Update: ${issueSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: white; margin: 0;">✓ Your Issue Has Been Addressed</h2>
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0; color: #333;">Welcome to Ecofy,</p>
            <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">
              The <strong>${municipalityName}</strong> municipality has worked on your issue and marked it as completed. 
              Please review the details below and indicate whether this has resolved your concern.
            </p>
          </div>

          <div style="background-color: #fff; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Issue Details</h3>
            
            <div style="margin-bottom: 15px;">
              <p style="margin: 0; color: #888; font-size: 12px; font-weight: bold; text-transform: uppercase;">Subject</p>
              <p style="margin: 5px 0 0 0; color: #333; font-size: 16px; font-weight: bold;">${issueSubject}</p>
            </div>

            <div style="margin-bottom: 15px;">
              <p style="margin: 0; color: #888; font-size: 12px; font-weight: bold; text-transform: uppercase;">Description</p>
              <p style="margin: 5px 0 0 0; color: #555; line-height: 1.6;">${issueDescription}</p>
            </div>

            <div>
              <p style="margin: 0; color: #888; font-size: 12px; font-weight: bold; text-transform: uppercase;">Handled by</p>
              <p style="margin: 5px 0 0 0; color: #333;">${adminName} - ${municipalityName}</p>
            </div>
          </div>

          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50; margin-bottom: 20px;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>What happens next?</strong><br/>
              Please open the Ecofy app and mark this issue as "Solved" if you believe it has been successfully resolved. 
              Your feedback helps us improve our community services.
            </p>
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px;">
            <p style="margin: 0; color: #888; font-size: 12px;">
              Best regards,<br/>
              <strong>Ecofy Community App</strong><br/>
              <em>Making municipalities more responsive</em>
            </p>
          </div>
        </div>
      `
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return false;
    }

    console.log('Issue completion email sent successfully to:', userEmail);
    console.log('Email ID:', result.data?.id);
    return true;
  } catch (err) {
    console.error('Error sending issue completion email:', err.message);
    console.error('Full error:', err);
    return false;
  }
}

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendIssueCompletionEmail
};
