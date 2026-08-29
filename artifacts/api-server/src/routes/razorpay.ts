import Razorpay from "razorpay";
import { Router, type IRouter } from "express";

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

export default router;