const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});


async function sendAnalysisCompletedEmail(to, videoTitle, dashboardUrl) {
  try {
    const mailOptions = {
      from: `"Commenta - YouTube Analytics" <${process.env.EMAIL_USER}>`,
      to,
      subject: `✅ Analysis Complete: "${videoTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Analysis Complete!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e9ecef; border-top: none;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6;">Hi there,</p>
            
            <p style="color: #333333; font-size: 16px; line-height: 1.6;">
              Great news! The comment analysis for your video is now complete.
            </p>

            <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #555; margin: 0; font-size: 15px;">
                <strong style="color: #333;">Video:</strong> ${videoTitle}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: #ffffff; text-decoration: none; padding: 14px 40px; 
                        border-radius: 6px; font-size: 16px; font-weight: bold;">
                View Dashboard →
              </a>
            </div>
            
            <p style="color: #999999; font-size: 13px; text-align: center;">
              Or copy this link: <a href="${dashboardUrl}" style="color: #667eea;">${dashboardUrl}</a>
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              Commenta - YouTube Comment Analytics
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi there,

The analysis for your video "${videoTitle}" is completed.

View your results: ${dashboardUrl}

Thanks,
Commenta Team
      `.trim(),
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
}

module.exports = { sendAnalysisCompletedEmail };
