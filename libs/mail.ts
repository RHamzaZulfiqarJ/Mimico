import nodemailer from "nodemailer";

type PasswordResetEmailInput = {
    to: string;
    firstName: string;
    resetUrl: string;
};

function getSmtpConfig() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS?.replace(/\s/g, "");
    const from = process.env.SMTP_FROM;

    if (!host || !port || !user || !pass || !from) {
        throw new Error("SMTP configuration is missing");
    }

    if (Number.isNaN(port)) {
        throw new Error("SMTP_PORT must be a valid number");
    }

    return {
        host,
        port,
        user,
        pass,
        from,
    };
}

export async function sendPasswordResetEmail({ to, firstName, resetUrl }: PasswordResetEmailInput) {
    const smtp = getSmtpConfig();

    const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        requireTLS: smtp.port === 587,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
        tls: {
            servername: smtp.host,
        },
    });

    await transporter.verify();

    const result = await transporter.sendMail({
        from: smtp.from,
        to,
        envelope: {
            from: smtp.user,
            to,
        },
        subject: "Your MIMICO password reset link",
        text: `Hi ${firstName},

You requested to reset your password.

Use this link:

${resetUrl}

This link expires in 15 minutes.

If you did not request this, you can ignore this email.

MIMICO Team`,
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
                <h2>Your MIMICO password reset link</h2>
                <p>Hi ${firstName},</p>
                <p>You requested to reset your password.</p>
                <p>
                    <a href="${resetUrl}" style="background:#4f46e5;color:#ffffff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block">
                        Reset Password
                    </a>
                </p>
                <p>This link will expire in 15 minutes.</p>
                <p>If you did not request this, you can ignore this email.</p>
                <p>Thanks,<br />MIMICO Team</p>
            </div>
        `,
    });

    if (!result.accepted.length) {
        throw new Error("SMTP server did not accept the email");
    }

    return {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
    };
}