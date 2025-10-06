const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);


async function sendAnalysisCompletedEmail(to, videoTitle, dashboardUrl) {
  try {
    const htmlContent = `
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
    `;

    const { data, error } = await resend.emails.send({
      from: 'Commenta <onboarding@resend.dev>', // Sender
      to, // Receiver email
      subject: `Analysis Complete: "${videoTitle}"`,
      html: htmlContent,
      text: `Your analysis for "${videoTitle}" is ready! View it here: ${dashboardUrl}`,
    });

    if (error) {
      console.error('Email send failed:', error.message);
      throw error;
    }

    console.log('Email sent successfully via Resend:', data?.id || 'No ID');
    return { success: true, id: data?.id };

  } catch (err) {
    console.error('Unexpected email error:', err.message);
    throw err;
  }
}

module.exports = { sendAnalysisCompletedEmail };
