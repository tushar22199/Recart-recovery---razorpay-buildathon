import Razorpay from "razorpay";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  recoveryAttempts,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
const router: IRouter = Router();

function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay API keys are not configured");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}


router.get("/razorpay/recovery-order/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await db
      .select()
      .from(recoveryAttempts)
      .where(eq(recoveryAttempts.id, id))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Recovery attempt not found",
      });
    }

    const attempt = rows[0];

    if (!attempt.razorpayPaymentLinkId) {
      return res.status(400).json({
        error: "No Razorpay recovery payment link exists",
      });
    }

    const razorpay = getRazorpayClient();

    const paymentLink = await razorpay.paymentLink.fetch(
      attempt.razorpayPaymentLinkId,
    );

    return res.json({
      id: paymentLink.id,
      shortUrl: paymentLink.short_url,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      status: paymentLink.status,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Failed to load Razorpay recovery order", error);

    return res.status(500).json({
      error: "Failed to load Razorpay recovery order",
    });
  }
});

export default router;