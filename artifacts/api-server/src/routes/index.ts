import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recoveryRouter from "./recovery";
import razorpayRouter from "./razorpay";
import razorpayWebhookRouter from "./razorpay-webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recoveryRouter);
router.use(razorpayRouter);
router.use(razorpayWebhookRouter);

export default router;