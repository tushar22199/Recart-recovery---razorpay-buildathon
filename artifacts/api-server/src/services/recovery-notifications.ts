import { Resend } from "resend";
import twilio from "twilio";

type NotificationInput = {
  customer: string;
  email: string;
  phone?: string | null;
  amount: number;
  currency: string;
  paymentLink: string;
  channel: "Email" | "WhatsApp";
  failureReason: string;
};

type NotificationResult = {
  sent: boolean;
  provider: "resend" | "twilio" | "none";
  message: string;
};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      )
    : null;

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-IN")}`;
}

export async function sendRecoveryNotification(
  input: NotificationInput,
): Promise<NotificationResult> {
  const amount = formatAmount(input.amount, input.currency);

  if (input.channel === "Email") {
    if (!resend || !process.env.RESEND_FROM_EMAIL) {
      return {
        sent: false,
        provider: "none",
        message: "Email provider is not configured.",
      };
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: input.email,
      subject: "Your payment could not be completed",
      html: `
        <p>Hi ${input.customer},</p>

        <p>
          We noticed that your payment of <strong>${amount}</strong>
          could not be completed.
        </p>

        <p>
          You can securely retry your payment using the link below:
        </p>

        <p>
          <a href="${input.paymentLink}">Complete payment</a>
        </p>

        <p>
          ReCart recovery assistant
        </p>
      `,
    });

    return {
      sent: true,
      provider: "resend",
      message: "Recovery email sent.",
    };
  }

  if (!twilioClient) {
    return {
      sent: false,
      provider: "none",
      message: "WhatsApp provider is not configured.",
    };
  }

  if (!input.phone) {
    return {
      sent: false,
      provider: "none",
      message: "Customer phone number is missing.",
    };
  }

  if (!process.env.TWILIO_WHATSAPP_FROM) {
    return {
      sent: false,
      provider: "none",
      message: "Twilio WhatsApp sender is not configured.",
    };
  }

  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;

  if (!contentSid) {
    return {
      sent: false,
      provider: "twilio",
      message: "Twilio WhatsApp Content SID is not configured.",
    };
  }

  await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${input.phone.replace(/^whatsapp:/, "")}`,
    contentSid,
    contentVariables: JSON.stringify({
      "1": input.customer,
      "2": input.paymentLink,
    }),
  });

  return {
    sent: true,
    provider: "twilio",
    message: "Recovery WhatsApp message sent.",
  };
}