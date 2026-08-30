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

router.post("/razorpay/test-order", async (req, res) => {
  try {
    const razorpay = getRazorpayClient();

    const amount =
      typeof req.body?.amount === "number" && req.body.amount > 0
        ? Math.round(req.body.amount)
        : 50000;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `recart_test_${Date.now()}`,
      notes: {
        source: "ReCart buildathon test",
      },
    });

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Failed to create Razorpay test order", error);

    res.status(500).json({
      error: "Failed to create Razorpay test order",
    });
  }
});
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

    if (!attempt.razorpayOrderId) {
      return res.status(400).json({
        error: "No Razorpay recovery order exists",
      });
    }

    const razorpay = getRazorpayClient();

    const order = await razorpay.orders.fetch(
      attempt.razorpayOrderId,
    );

    return res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
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