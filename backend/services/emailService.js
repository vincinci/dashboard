const nodemailer = require('nodemailer');

// Email configuration
const createTransporter = () => {
  // Check if we have production SMTP settings
  const hasProductionConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  
  if (hasProductionConfig) {
    // Production email configuration (Brevo/real SMTP)
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });
  } else {
    // Development: Use Ethereal Email for testing
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }
};

const sendPasswordResetEmail = async (email, resetToken, displayName) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@iwanyu.store',
      to: email,
      subject: 'Reset Your Iwanyu Vendor Dashboard Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b; margin: 0;">🛍️ Iwanyu Store</h1>
            <p style="color: #6b7280; margin: 5px 0;">Vendor Dashboard</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h2 style="color: #374151; margin: 0 0 20px 0;">Password Reset Request</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
              Hello <strong>${displayName}</strong>,
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password for your Iwanyu Vendor Dashboard account. 
              Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            
            <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all; 
                      font-family: monospace; font-size: 12px;">
              ${resetUrl}
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 14px; margin-bottom: 10px;">
                ⚠️ This link will expire in 1 hour for security reasons.
              </p>
              
              <p style="color: #9ca3af; font-size: 14px; margin-bottom: 0;">
                If you didn't request this password reset, please ignore this email and your password will remain unchanged.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2024 Iwanyu Store. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    const hasProductionConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    
    if (hasProductionConfig) {
      console.log('✅ Password reset email sent via Brevo!');
      console.log('📧 Message ID:', info.messageId);
      console.log('📧 Sent to:', email);
    } else {
      console.log('📧 Password reset email sent (development mode)!');
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail
}; 