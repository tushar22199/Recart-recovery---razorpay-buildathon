import { Resend } from "resend";

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
  provider: "resend" | "green-api" | "none";
  message: string;
};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-IN")}`;
}

export async function sendRecoveryNotification(
  input: NotificationInput,
): Promise<NotificationResult> {
  const amount = formatAmount(input.amount, input.currency);

  // Email recovery notification
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

  // WhatsApp recovery notification via GREEN-API
  if (input.channel === "WhatsApp") {
    if (!input.phone) {
      return {
        sent: false,
        provider: "none",
        message:
          "WhatsApp notification blocked: customer phone number is missing.",
      };
    }

    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;

    if (!instanceId || !apiToken) {
      return {
        sent: false,
        provider: "none",
        message: "GREEN-API WhatsApp credentials are not configured.",
      };
    }

    const phone = input.phone
      .replace(/^whatsapp:/, "")
      .replace(/\D/g, "");

    const response = await fetch(
      `https://api.greenapi.com/waInstance${instanceId}/sendMessage/${apiToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: `${phone}@c.us`,
          message: [
            `Hi ${input.customer},`,
            "",
            `Your payment of ${amount} could not be completed.`,
            "",
            "You can securely retry your payment here:",
            input.paymentLink,
            "",
            "— ReCart Recovery",
          ].join("\n"),
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      return {
        sent: false,
        provider: "none",
        message: `GREEN-API WhatsApp request failed: ${errorText}`,
      };
    }

    const result = (await response.json()) as {
      idMessage?: string;
    };

    if (!result.idMessage) {
      return {
        sent: false,
        provider: "none",
        message:
          "GREEN-API accepted the request but returned no message ID.",
      };
    }

    return {
      sent: true,
      provider: "green-api",
      message: `WhatsApp message sent via GREEN-API (${result.idMessage}).`,
    };
  }

  return {
    sent: false,
    provider: "none",
    message: `Unsupported recovery channel: ${input.channel}`,
  };
}