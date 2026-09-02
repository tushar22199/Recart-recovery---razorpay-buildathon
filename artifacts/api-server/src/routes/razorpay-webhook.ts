import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  recoveryAttempts,
  recoveryAuditEvents,
  recoveryConfig,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

type RazorpayPaymentEntity = {
  id?: string;
  amount?: number;
  currency?: string;
  method?: string;
  email?: string;
  contact?: string;
  error_code?: string | null;
  error_description?: string | null;
  order_id?: string | null;
  payment_link_id?: string | null;
};

type RazorpayWebhook = {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: {
      entity?: RazorpayPaymentEntity;
    };
    payment_link?: {
      entity?: {
        id?: string | null;
        order_id?: string | null;
      };
    };
  };
};

function verifyWebhookSignature(
  body: Buffer,
  receivedSignature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const received = Buffer.from(receivedSignature.trim(), "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
}

router.post("/webhooks/razorpay", async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not configured");

    return res.status(500).json({
      error: "Webhook secret is not configured",
    });
  }

  const signature = req.header("X-Razorpay-Signature");

  if (!signature) {
    return res.status(400).json({
      error: "Missing Razorpay webhook signature",
    });
  }

  if (!Buffer.isBuffer(req.body)) {
    console.error(
      "Razorpay webhook body is not a Buffer. Check express.raw() middleware order.",
    );

    return res.status(400).json({
      error: "Webhook body was not received as raw data",
    });
  }

  /*
   * Razorpay signs the EXACT raw request body.
   * Do not JSON.stringify(), parse and re-stringify, or otherwise modify it
   * before signature verification.
   */
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    console.error("Invalid Razorpay webhook signature", {
      bodyLength: req.body.length,
      signatureLength: signature.length,
    });

    return res.status(400).json({
      error: "Invalid Razorpay webhook signature",
    });
  }

  let event: RazorpayWebhook;

  try {
    event = JSON.parse(req.body.toString("utf8")) as RazorpayWebhook;
  } catch {
    return res.status(400).json({
      error: "Invalid JSON payload",
    });
  }

  const eventId = req.header("x-razorpay-event-id");

  console.log(
    JSON.stringify({
      message: "Razorpay webhook received",
      event: event.event,
      eventId,
      bodyLength: req.body.length,
    }),
  );

  if (
    event.event !== "payment.failed" &&
    event.event !== "payment.captured" &&
    event.event !== "payment_link.paid"
  ) {
    return res.status(200).json({
      received: true,
      processed: false,
    });
  }

  const payment = event.payload?.payment?.entity;

  if (!payment?.id) {
    return res.status(400).json({
      error: "Payment entity is missing",
    });
  }

  try {
    /*
     * PAYMENT FAILED
     *
     * Create a new recovery attempt for the failed payment.
     */
    if (event.event === "payment.failed") {
      const existing = await db
        .select()
        .from(recoveryAttempts)
        .where(eq(recoveryAttempts.razorpayPaymentId, payment.id))
        .limit(1);

      if (existing.length > 0) {
        return res.status(200).json({
          received: true,
          processed: false,
          duplicate: true,
        });
      }

      const configRows = await db
        .select()
        .from(recoveryConfig)
        .limit(1);

      const recoveryPolicy = configRows[0] ?? {
        maxAttempts: 3,
        cooldownMinutes: 45,
        windowHours: 24,
        discountCap: 10,
        enabled: true,
      };

      const now = new Date();
      const id = `rp_${payment.id}`;

      const inserted = await db
        .insert(recoveryAttempts)
        .values({
          id,
          customer:
            payment.email ??
            payment.contact ??
            "Razorpay customer",
          email: payment.email ?? "",
          amount: String((payment.amount ?? 0) / 100),
          currency: payment.currency ?? "INR",
          failureReason:
            payment.error_description ??
            "Razorpay payment failed",
          failureCode:
            payment.error_code ??
            "payment_failed",
          channel: payment.method ?? "unknown",
          status: "pending",
          attempts: 1,
          maxAttempts: recoveryPolicy.maxAttempts,
          detectedAt: now,
          lastAction: "Payment failure detected",
          lastActionAt: now,
          paymentMethod: payment.method ?? "unknown",
          expiresAt: new Date(
            now.getTime() +
              recoveryPolicy.windowHours * 60 * 60 * 1000,
          ),
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id ?? null,
        })
        .returning();

      const attempt = inserted[0];

      await db.insert(recoveryAuditEvents).values({
        id: `${id}_detected`,
        recoveryAttemptId: id,
        type: "detected",
        title: "Payment failure detected",
        description:
          payment.error_description ??
          `Razorpay reported ${
            payment.error_code ?? "payment_failed"
          }.`,
        timestamp: now,
        actor: "Razorpay webhook",
        meta: `payment.failed:${payment.id}`,
      });

      return res.status(200).json({
        received: true,
        processed: true,
        recoveryAttemptId: attempt.id,
      });
    }

    /*
     * PAYMENT CAPTURED
     *
     * IMPORTANT:
     * A successful recovery payment can have a different payment ID
     * from the failed payment. For Payment Links, match by
     * payment_link_id first, then fall back to order ID and payment ID.
     */
    if (
      event.event === "payment.captured" ||
      event.event === "payment_link.paid"
    ) {
      const paymentLinkId =
        payment.payment_link_id ??
        event.payload?.payment_link?.entity?.id ??
        null;

      const findByPaymentLinkId = paymentLinkId
        ? await db
            .select()
            .from(recoveryAttempts)
            .where(
              eq(
                recoveryAttempts.razorpayPaymentLinkId,
                paymentLinkId,
              ),
            )
            .limit(1)
        : [];

      let existing = findByPaymentLinkId;

      if (existing.length === 0 && payment.order_id) {
        existing = await db
          .select()
          .from(recoveryAttempts)
          .where(
            eq(
              recoveryAttempts.razorpayOrderId,
              payment.order_id,
            ),
          )
          .limit(1);
      }

      if (existing.length === 0) {
        existing = await db
          .select()
          .from(recoveryAttempts)
          .where(
            eq(
              recoveryAttempts.razorpayPaymentId,
              payment.id,
            ),
          )
          .limit(1);
      }

      /*
       * Fallback for older records where order_id was not stored.
       */

      if (existing.length > 0) {
        const attempt = existing[0];
        if (
          attempt.status === "recovered" &&
          attempt.razorpayPaymentId === payment.id
        ) {
          return res.status(200).json({
            received: true,
            processed: false,
            duplicate: true,
          });
        }
        
        const now = new Date();

        await db
          .update(recoveryAttempts)
          .set({
            status: "recovered",
            recoveredAt: now,
            lastAction: "Payment captured",
            lastActionAt: now,
            razorpayPaymentId: payment.id,
            razorpayOrderId:
              payment.order_id ??
              attempt.razorpayOrderId,
          })
          .where(eq(recoveryAttempts.id, attempt.id));

        await db.insert(recoveryAuditEvents).values({
          id: `${attempt.id}_captured_${payment.id}`,
          recoveryAttemptId: attempt.id,
          type: "outcome",
          title: "Payment recovered",
          description:
            "Razorpay confirmed payment capture.",
          timestamp: now,
          actor: "Razorpay webhook",
          meta: JSON.stringify({
            event: event.event,
            eventId,
            paymentId: payment.id,
            orderId: payment.order_id,
          }),
        });

        console.log(
          JSON.stringify({
            message: "Recovery attempt marked recovered",
            recoveryAttemptId: attempt.id,
            paymentId: payment.id,
            orderId: payment.order_id,
          }),
        );
      } else {
        console.log(
          JSON.stringify({
            message:
              "Captured payment did not match a recovery attempt",
            paymentId: payment.id,
            orderId: payment.order_id,
          }),
        );
      }
    }

    return res.status(200).json({
      received: true,
      processed: true,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook processing failed",
      error,
    );

    return res.status(500).json({
      error: "Webhook processing failed",
    });
  }
});

export default router;