// Simplified email service for optimized system
// In production, this would integrate with a proper email service

const sendPasswordResetEmail = async (email, resetToken, displayName) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    // For now, just log the email details
    // In production, this would send actual emails
    console.log('📧 Password reset email would be sent:');
    console.log('📧 To:', email);
    console.log('📧 User:', displayName);
    console.log('📧 Reset URL:', resetUrl);
    console.log('📧 Token expires in 1 hour');
    
    return { 
      success: true, 
      messageId: `mock-${Date.now()}`,
      message: 'Email logged (production email service not configured)'
    };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail
}; 