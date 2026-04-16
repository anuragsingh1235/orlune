const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendOrluneOTP = async (to, otp, subject = "Vault Access Recovery Protocol") => {
  const mailOptions = {
    from: `"Orlune Security" <${process.env.EMAIL_USER}>`,
    to,
    subject: subject,
    html: `
      <div style="font-family: 'Inter', sans-serif; background: #0B0E14; color: white; padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
        <h1 style="color: #B48EAD; margin-bottom: 20px;">Orlune Security Protocol</h1>
        <p style="font-size: 1.1rem; color: #888;">Use the security code below for your ${subject}:</p>
        <div style="background: rgba(255,255,255,0.03); padding: 25px; font-size: 3rem; font-weight: 800; letter-spacing: 12px; text-align: center; border-radius: 16px; border: 1px solid #B48EAD; color: #fff; margin: 20px 0;">
          ${otp}
        </div>
        <p style="margin-top: 30px; font-size: 0.8rem; color: #555;">Protected by Orlune Vault Defense. If you did not request this, ignore this email.</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};
