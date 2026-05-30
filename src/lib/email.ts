import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  if (!process.env.EMAIL_SERVER_HOST) {
    console.log("[DEV] Password reset link:", resetUrl);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@example.com",
    to: email,
    subject: "Recuperación de contraseña - Bitácora de Calderas",
    html: `
      <p>Recibió esta solicitud para restablecer su contraseña.</p>
      <p><a href="${resetUrl}">Restablecer contraseña</a></p>
      <p>Este enlace expira en 1 hora.</p>
    `,
  });
}
