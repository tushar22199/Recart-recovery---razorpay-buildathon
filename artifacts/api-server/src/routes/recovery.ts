import { Router, type IRouter } from "express";
import {
  GetRecoveryActivityResponse,
  GetRecoveryAttemptParams,
  GetRecoveryAttemptResponse,
  GetRecoveryAttemptsResponse,
  GetRecoveryConfigResponse,
  GetRecoverySummaryResponse,
  RetryRecoveryAttemptParams,
  RetryRecoveryAttemptResponse,
  SimulateRecoveryAttemptResponse,
  UpdateRecoveryConfigBody,
  UpdateRecoveryConfigResponse,
} from "@workspace/api-zod";

type RecoveryAttempt = {
  id: string;
  customer: string;
  email: string;
  amount: number;
  currency: string;
  failureReason: string;
  failureCode: string;
  channel: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  detectedAt: string;
  lastAction: string;
  lastActionAt: string;
  paymentMethod: string;
  recoveredAt: string | null;
  expiresAt: string | null;
};

type AuditEvent = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  meta: string | null;
};

const router: IRouter = Router();

const now = Date.now();
const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString();
const hoursFromNow = (hours: number) => new Date(now + hours * 60 * 60 * 1000).toISOString();

const blueprints = [
  {
    customer: "Aarav Mehta",
    email: "aarav.m@northstar.in",
    amount: 12999,
    failureReason: "Bank decline",
    failureCode: "BAD_REQUEST_ERROR",
    paymentMethod: "Visa •••• 4242",
    channel: "Email",
  },
  {
    customer: "Priya Shah",
    email: "priya.s@studio47.co",
    amount: 7490,
    failureReason: "OTP timeout",
    failureCode: "AUTHENTICATION_ERROR",
    paymentMethod: "Mastercard •••• 8210",
    channel: "WhatsApp",
  },
  {
    customer: "Rohan Iyer",
    email: "rohan.i@kineticlabs.io",
    amount: 18400,
    failureReason: "UPI collect not accepted",
    failureCode: "PAYMENT_PENDING",
    paymentMethod: "UPI · rohan@okicici",
    channel: "Email",
  },
  {
    customer: "Nisha Kapoor",
    email: "nisha.k@brightcart.com",
    amount: 5499,
    failureReason: "Network abort",
    failureCode: "GATEWAY_ERROR",
    paymentMethod: "UPI · nisha@oksbi",
    channel: "WhatsApp",
  },
  {
    customer: "Kabir Rao",
    email: "kabir.r@formandfunction.in",
    amount: 21990,
    failureReason: "Insufficient funds",
    failureCode: "BAD_REQUEST_ERROR",
    paymentMethod: "Visa •••• 1108",
    channel: "Email",
  },
  {
    customer: "Ananya Sen",
    email: "ananya.s@fieldnotes.store",
    amount: 8990,
    failureReason: "Price hesitation",
    failureCode: "ORDER_TIMEOUT",
    paymentMethod: "RuPay •••• 7344",
    channel: "WhatsApp",
  },
];

const recoveredIndexes = new Set([0, 1, 2, 3, 5, 6, 8, 10, 13, 16, 19, 22]);
const escalatedIndexes = new Set([4, 9, 14, 20, 24, 28]);
const gaveUpIndexes = new Set([11, 25]);

let attempts: RecoveryAttempt[] = Array.from({ length: 30 }, (_, index) => {
  const blueprint = blueprints[index % blueprints.length];
  const status = recoveredIndexes.has(index)
    ? "recovered"
    : escalatedIndexes.has(index)
      ? "escalated"
      : gaveUpIndexes.has(index)
        ? "gave_up"
        : "pending";
  const attemptCount = status === "escalated" ? 3 : status === "recovered" ? 1 + (index % 2) : 1;
  return {
    id: `rc_${String(1000 + index)}`,
    customer: blueprint.customer,
    email: blueprint.email,
    amount: blueprint.amount + (index % 4) * 250,
    currency: "INR",
    failureReason: blueprint.failureReason,
    failureCode: blueprint.failureCode,
    channel: blueprint.channel,
    status,
    attempts: attemptCount,
    maxAttempts: 3,
    detectedAt: hoursAgo(2 + index * 1.7),
    lastAction:
      status === "recovered"
        ? "Payment link paid"
        : status === "escalated"
          ? "Flagged for human follow-up"
          : status === "gave_up"
            ? "Recovery window closed"
            : "Fresh payment link sent",
    lastActionAt: hoursAgo(status === "pending" ? 0.3 + (index % 3) : 2 + (index % 5)),
    paymentMethod: blueprint.paymentMethod,
    recoveredAt: status === "recovered" ? hoursAgo(0.8 + (index % 8)) : null,
    expiresAt: status === "pending" ? hoursFromNow(8 + (index % 12)) : null,
  };
});

let config = {
  maxAttempts: 3,
  cooldownMinutes: 45,
  windowHours: 24,
  discountCap: 10,
  enabled: true,
};

const audits = new Map<string, AuditEvent[]>();

function createAudit(attempt: RecoveryAttempt): AuditEvent[] {
  const diagnosis = attempt.failureReason.toLowerCase();
  return [
    {
      id: `${attempt.id}_detected`,
      type: "detected",
      title: "Checkout attempt detected",
      description: `Razorpay reported a ${attempt.failureCode} event for ${attempt.paymentMethod}.`,
      timestamp: attempt.detectedAt,
      actor: "Razorpay webhook",
      meta: attempt.failureCode,
    },
    {
      id: `${attempt.id}_diagnosed`,
      type: "diagnosed",
      title: "Failure diagnosed",
      description: `The recovery engine classified this as ${diagnosis}.`,
      timestamp: new Date(new Date(attempt.detectedAt).getTime() + 30000).toISOString(),
      actor: "ReCart rules engine",
      meta: "confidence: 0.91",
    },
    {
      id: `${attempt.id}_action`,
      type: "action",
      title: attempt.lastAction,
      description:
        attempt.status === "recovered"
          ? "The customer completed payment through the generated recovery link."
          : `A bounded ${attempt.channel.toLowerCase()} nudge was sent with a fresh payment link.`,
      timestamp: attempt.lastActionAt,
      actor: "ReCart agent",
      meta: `attempt ${attempt.attempts} of ${attempt.maxAttempts}`,
    },
    ...(attempt.status === "recovered"
      ? [
          {
            id: `${attempt.id}_outcome`,
            type: "outcome",
            title: "Payment recovered",
            description: `₹${attempt.amount.toLocaleString("en-IN")} captured successfully.`,
            timestamp: attempt.recoveredAt ?? attempt.lastActionAt,
            actor: "Razorpay webhook",
            meta: "payment.captured",
          },
        ]
      : []),
  ];
}

attempts.forEach((attempt) => audits.set(attempt.id, createAudit(attempt)));

function getSummary() {
  const atRisk = attempts.reduce((total, attempt) => total + attempt.amount, 0);
  const recovered = attempts
    .filter((attempt) => attempt.status === "recovered")
    .reduce((total, attempt) => total + attempt.amount, 0);
  const recoveredCount = attempts.filter((attempt) => attempt.status === "recovered").length;
  const pendingCount = attempts.filter((attempt) => attempt.status === "pending").length;
  const escalatedCount = attempts.filter((attempt) => attempt.status === "escalated").length;
  const labels = ["18 Aug", "19 Aug", "20 Aug", "21 Aug", "22 Aug", "23 Aug", "24 Aug"];
  const trend = labels.map((label, index) => ({
    label,
    recovered: Math.round(recovered * (0.54 + index * 0.07)),
    atRisk: Math.round(atRisk * (0.58 + index * 0.06)),
  }));
  return {
    recovered,
    atRisk,
    recoveryRate: atRisk ? Number(((recovered / atRisk) * 100).toFixed(1)) : 0,
    totalAttempts: attempts.length,
    recoveredCount,
    pendingCount,
    escalatedCount,
    trend,
  };
}

const activity = [
  {
    id: "act_1",
    title: "Payment recovered",
    detail: "Aarav Mehta completed a retry via UPI",
    timestamp: "6 min ago",
    tone: "success",
  },
  {
    id: "act_2",
    title: "Recovery nudge sent",
    detail: "Fresh payment link delivered to 4 customers",
    timestamp: "18 min ago",
    tone: "info",
  },
  {
    id: "act_3",
    title: "Escalation flagged",
    detail: "3 attempts exhausted for Kabir Rao",
    timestamp: "42 min ago",
    tone: "warning",
  },
  {
    id: "act_4",
    title: "Failure pattern detected",
    detail: "UPI collect acceptance is down 8% today",
    timestamp: "1 hr ago",
    tone: "neutral",
  },
];

router.get("/recovery/summary", (_req, res) => {
  res.json(GetRecoverySummaryResponse.parse(getSummary()));
});

router.get("/recovery/attempts", (_req, res) => {
  res.json(GetRecoveryAttemptsResponse.parse(attempts));
});

router.get("/recovery/attempts/:id", (req, res) => {
  const { id } = GetRecoveryAttemptParams.parse(req.params);
  const attempt = attempts.find((item) => item.id === id);
  if (!attempt) {
    res.status(404).json({ error: "Recovery attempt not found" });
    return;
  }
  res.json(GetRecoveryAttemptResponse.parse({ ...attempt, audit: audits.get(id) ?? [] }));
});

router.post("/recovery/attempts/:id/retry", (req, res) => {
  const { id } = RetryRecoveryAttemptParams.parse(req.params);
  const attempt = attempts.find((item) => item.id === id);
  if (!attempt) {
    res.status(404).json({ error: "Recovery attempt not found" });
    return;
  }
  if (attempt.attempts >= Math.min(config.maxAttempts, attempt.maxAttempts)) {
    res.status(400).json({ error: "Retry limit reached for this order" });
    return;
  }
  const timestamp = new Date().toISOString();
  attempt.attempts += 1;
  attempt.status = "pending";
  attempt.channel = attempt.attempts % 2 === 0 ? "WhatsApp" : "Email";
  attempt.lastAction = "Fresh payment link generated";
  attempt.lastActionAt = timestamp;
  attempt.expiresAt = hoursFromNow(config.windowHours);
  const existingAudit = audits.get(id) ?? [];
  existingAudit.push({
    id: `${id}_retry_${attempt.attempts}`,
    type: "action",
    title: "Fresh payment link generated",
    description: `Retry ${attempt.attempts} of ${attempt.maxAttempts} sent via ${attempt.channel}.`,
    timestamp,
    actor: "ReCart agent",
    meta: `cooldown: ${config.cooldownMinutes} minutes`,
  });
  audits.set(id, existingAudit);
  res.json(RetryRecoveryAttemptResponse.parse(attempt));
});

router.get("/recovery/activity", (_req, res) => {
  res.json(GetRecoveryActivityResponse.parse(activity));
});

router.get("/recovery/config", (_req, res) => {
  res.json(GetRecoveryConfigResponse.parse(config));
});

router.patch("/recovery/config", (req, res) => {
  config = UpdateRecoveryConfigBody.parse(req.body);
  res.json(UpdateRecoveryConfigResponse.parse(config));
});

router.post("/recovery/simulate", (_req, res) => {
  const index = attempts.length;
  const blueprint = blueprints[index % blueprints.length];
  const timestamp = new Date().toISOString();
  const attempt: RecoveryAttempt = {
    id: `rc_${String(1000 + index)}`,
    ...blueprint,
    amount: blueprint.amount + 375,
    currency: "INR",
    status: "pending",
    attempts: 1,
    maxAttempts: config.maxAttempts,
    detectedAt: timestamp,
    lastAction: "Fresh payment link sent",
    lastActionAt: timestamp,
    recoveredAt: null,
    expiresAt: hoursFromNow(config.windowHours),
  };
  attempts = [attempt, ...attempts];
  audits.set(attempt.id, createAudit(attempt));
  res.status(201).json(SimulateRecoveryAttemptResponse.parse({ attempt, summary: getSummary() }));
});

export default router;