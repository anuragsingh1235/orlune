const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Orlune" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email sent] -> ${to}`);
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
};

const sendOrluneOTP = async (to, otp, purpose = "Verification") => {
  const brandColor = "#1a84f3";
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0e14; color: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
        
        <!-- Logo Area Placeholder -->
        <h1 style="margin: 0 0 30px; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px;">
          <span style="color: ${brandColor};">▲</span> ORLUNE
        </h1>

        <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">${purpose} Code</h2>
        
        <p style="font-size: 15px; color: #a1a1aa; line-height: 1.6; margin-bottom: 30px;">
          You recently requested to authenticate with your Orlune account. Use the secure authorization code below to proceed. This code is valid for 10 minutes.
        </p>

        <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #ffffff;">${otp}</span>
        </div>

        <p style="font-size: 13px; color: #71717a; margin-bottom: 40px; line-height: 1.5;">
          If you did not initiate this request, you can safely ignore this email. Your cinematic archive remains secure.
        </p>

        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
            <p style="font-size: 12px; color: #52525b; margin: 0;">
                © ${new Date().getFullYear()} Orlune Platform. All rights reserved. <br/>
                Curate your cinematic universe safely.
            </p>
        </div>
    </div>
  `;
  
  await sendEmail(to, `Your Orlune ${purpose} Code`, html);
};

module.exports = { sendEmail, sendOrluneOTP };
