import nodemailer from "nodemailer";
import { BRAND_TITLE } from "@/lib/constants";

function createTransporter() {
  const host = process.env.EMAIL_SERVER_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_SERVER_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const transporter = createTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[DEV] Password reset URL:", resetUrl);
    }
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@revram.mx",
    to: email,
    subject: `Recuperación de contraseña - ${BRAND_TITLE}`,
    html: `
      <p>Recibió esta solicitud para restablecer su contraseña en ${BRAND_TITLE}.</p>
      <p><a href="${resetUrl}">Restablecer contraseña</a></p>
      <p>Este enlace expira en 1 hora.</p>
    `,
  });
}
