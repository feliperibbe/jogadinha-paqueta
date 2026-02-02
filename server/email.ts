import { Resend } from 'resend';

const ADMIN_EMAIL = "felipe.vasconcellos@ab-inbev.com";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured - email notifications disabled");
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function getBaseUrl(): string {
  return process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : "http://localhost:5000";
}

interface EmailVerificationData {
  email: string;
  firstName: string;
  verificationToken: string;
}

export async function sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.log("Email verification skipped - RESEND_API_KEY not configured");
    return false;
  }

  const verificationLink = `${getBaseUrl()}/api/auth/verify-email?token=${data.verificationToken}`;

  try {
    const { error } = await client.emails.send({
      from: "Jogadinha do Paquetá <onboarding@resend.dev>",
      to: data.email,
      subject: "Confirme seu email - Jogadinha do Paquetá",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', -apple-system, sans-serif; background-color: #1a1a1a; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #0a0a0a; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
            <div style="background: linear-gradient(135deg, #E30613 0%, #b8050f 100%); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px;">
                JOGADINHA DO PAQUETÁ
              </h1>
            </div>
            
            <div style="padding: 32px 24px;">
              <h2 style="color: white; margin: 0 0 8px 0; font-size: 20px;">
                Olá, ${data.firstName}!
              </h2>
              <p style="color: #888; margin: 0 0 24px 0; font-size: 14px;">
                Confirme seu email para começar a usar a Jogadinha do Paquetá.
              </p>
              
              <a href="${verificationLink}" 
                 style="display: block; background: linear-gradient(135deg, #E30613 0%, #b8050f 100%); color: white; text-decoration: none; padding: 16px 24px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 16px;">
                CONFIRMAR EMAIL
              </a>
              
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 24px;">
                Se você não criou esta conta, ignore este email.
              </p>
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 8px;">
                Este link expira em 24 horas.
              </p>
            </div>
            
            <div style="background-color: #111; padding: 16px 24px; text-align: center; border-top: 1px solid #333;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                Jogadinha do Paquetá © 2026
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending verification email:", error);
      return false;
    }

    console.log(`Verification email sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
}

interface PaymentNotificationData {
  paymentRequestId: string;
  userName: string;
  userEmail: string;
  amount: string;
  approvalToken: string;
}

export async function sendPaymentNotification(data: PaymentNotificationData): Promise<boolean> {
  const client = getResend();
  if (!client) {
    return false;
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : "http://localhost:5000";

  const approvalLink = `${baseUrl}/api/admin/quick-approve/${data.approvalToken}`;

  try {
    const { error } = await client.emails.send({
      from: "Jogadinha do Paquetá <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `💰 Novo pagamento pendente - ${data.userName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', -apple-system, sans-serif; background-color: #1a1a1a; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #0a0a0a; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
            <div style="background: linear-gradient(135deg, #E30613 0%, #b8050f 100%); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px;">
                JOGADINHA DO PAQUETÁ
              </h1>
            </div>
            
            <div style="padding: 32px 24px;">
              <h2 style="color: #E30613; margin: 0 0 8px 0; font-size: 20px;">
                💰 Novo Pagamento Pendente
              </h2>
              <p style="color: #888; margin: 0 0 24px 0; font-size: 14px;">
                Alguém quer criar mais vídeos!
              </p>
              
              <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #888; padding: 8px 0; font-size: 14px;">Usuário:</td>
                    <td style="color: white; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${data.userName}</td>
                  </tr>
                  <tr>
                    <td style="color: #888; padding: 8px 0; font-size: 14px;">Email:</td>
                    <td style="color: white; padding: 8px 0; font-size: 14px; text-align: right;">${data.userEmail}</td>
                  </tr>
                  <tr>
                    <td style="color: #888; padding: 8px 0; font-size: 14px;">Valor:</td>
                    <td style="color: #22c55e; padding: 8px 0; font-size: 18px; text-align: right; font-weight: 700;">R$ ${data.amount}</td>
                  </tr>
                </table>
              </div>
              
              <a href="${approvalLink}" 
                 style="display: block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 24px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 16px;">
                ✓ APROVAR PAGAMENTO
              </a>
              
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 16px;">
                Clique no botão acima para aprovar instantaneamente
              </p>
            </div>
            
            <div style="background-color: #111; padding: 16px 24px; text-align: center; border-top: 1px solid #333;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                Jogadinha do Paquetá © 2026
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending email:", error);
      return false;
    }

    console.log(`Payment notification email sent to ${ADMIN_EMAIL}`);
    return true;
  } catch (error) {
    console.error("Error sending payment notification:", error);
    return false;
  }
}
