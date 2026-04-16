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

exports.sendReminderEmail = async (to, taskTitle, deadline) => {
  const mailOptions = {
    from: `"Orlune Priority" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🚨 RECALL: ${taskTitle}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; background: #0B0E14; color: white; padding: 40px; border-radius: 20px; border: 1px solid rgba(180, 142, 173, 0.2); max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
           <span style="background: #B48EAD; color: white; padding: 6px 16px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Strategic Alert</span>
        </div>
        <h1 style="color: #fff; font-size: 1.8rem; text-align: center; margin-bottom: 10px;">Operational Deadline Approaching</h1>
        <p style="color: #888; text-align: center; line-height: 1.6; font-size: 1rem;">
          Your current objective is entering a critical phase. Maintain momentum to ensure full mastery before the window expires.
        </p>
        
        <div style="background: rgba(255,255,255,0.03); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); margin: 30px 0; text-align: center;">
           <div style="font-size: 0.8rem; color: #B48EAD; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Scheduled Objective</div>
           <div style="font-size: 1.5rem; font-weight: 800; color: #fff; margin-bottom: 20px;">"${taskTitle}"</div>
           <div style="font-size: 0.8rem; color: #555;">Final Deadline: ${new Date(deadline).toLocaleString()}</div>
        </div>

        <div style="text-align: center;">
           <a href="https://watchlist-wars.vercel.app" style="background: #B48EAD; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block;">ACCESS VAULT</a>
        </div>
        <p style="margin-top: 40px; font-size: 0.75rem; color: #444; text-align: center;">Sent by Orlune Priority Services. This internal memo is automated.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};
