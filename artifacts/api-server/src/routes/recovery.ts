import { db } from "@workspace/db";
import {
  recoveryAttempts,
  recoveryAuditEvents,
  recoveryConfig,
} from "@workspace/db/schema";
import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import Razorpay from "razorpay";
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
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
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

type Config = {
  maxAttempts: number;
  cooldownMinutes: number;
  windowHours: number;
  discountCap: number;
  enabled: boolean;
};

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

const recoveredIndexes = new Set([
  0, 1, 2, 3, 5, 6, 8, 10, 13, 16, 19, 22,
]);

const escalatedIndexes = new Set([4, 9, 14, 20, 24, 28]);
const gaveUpIndexes = new Set([11, 25]);

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function toRecoveryAttempt(
  row: typeof recoveryAttempts.$inferSelect,
): RecoveryAttempt {
  return {
    id: row.id,
    customer: row.customer,
    email: row.email,
    amount: Number(row.amount),
    currency: row.currency,
    failureReason: row.failureReason,
    failureCode: row.failureCode,
    channel: row.channel,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    detectedAt: row.detectedAt.toISOString(),
    lastAction: row.lastAction,
    lastActionAt: row.lastActionAt.toISOString(),
    paymentMethod: row.paymentMethod ?? "",
    recoveredAt: row.recoveredAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    razorpayOrderId: row.razorpayOrderId ?? null,
    razorpayPaymentId: row.razorpayPaymentId ?? null,
  };
}

function toAuditEvent(
  row: typeof recoveryAuditEvents.$inferSelect,
): AuditEvent {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    timestamp: row.timestamp.toISOString(),
    actor: row.actor,
    meta: row.meta,
  };
}

async function getAttempts(): Promise<RecoveryAttempt[]> {
  const rows = await db
    .select()
    .from(recoveryAttempts)
    .orderBy(desc(recoveryAttempts.detectedAt));

  return rows.map(toRecoveryAttempt);
}

async function getConfig(): Promise<Config> {
  const rows = await db.select().from(recoveryConfig).limit(1);

  if (rows.length === 0) {
    const inserted = await db
      .insert(recoveryConfig)
      .values({
        id: 1,
        maxAttempts: 3,
        cooldownMinutes: 45,
        windowHours: 24,
        discountCap: 10,
        enabled: true,
      })
      .returning();

    return inserted[0];
  }

  return rows[0];
}

async function seedDatabase(): Promise<void> {
  const existing = await db
    .select({ id: recoveryAttempts.id })
    .from(recoveryAttempts)
    .limit(1);

  if (existing.length > 0) {
    await getConfig();
    return;
  }

  const attemptsToInsert = Array.from({ length: 30 }, (_, index) => {
    const blueprint = blueprints[index % blueprints.length];

    const status = recoveredIndexes.has(index)
      ? "recovered"
      : escalatedIndexes.has(index)
        ? "escalated"
        : gaveUpIndexes.has(index)
          ? "gave_up"
          : "pending";

    const attemptCount =
      status === "escalated"
        ? 3
        : status === "recovered"
          ? 1 + (index % 2)
          : 1;

    const detectedAt = hoursAgo(2 + index * 1.7);

    const lastAction =
      status === "recovered"
        ? "Payment link paid"
        : status === "escalated"
          ? "Flagged for human follow-up"
          : status === "gave_up"
            ? "Recovery window closed"
            : "Fresh payment link sent";

    const lastActionAt = hoursAgo(
      status === "pending" ? 0.3 + (index % 3) : 2 + (index % 5),
    );

    return {
      id: `rc_${String(1000 + index)}`,
      customer: blueprint.customer,
      email: blueprint.email,
      amount: String(blueprint.amount + (index % 4) * 250),
      currency: "INR",
      failureReason: blueprint.failureReason,
      failureCode: blueprint.failureCode,
      channel: blueprint.channel,
      status,
      attempts: attemptCount,
      maxAttempts: 3,
      detectedAt,
      lastAction,
      lastActionAt,
      paymentMethod: blueprint.paymentMethod,
      recoveredAt: status === "recovered"
        ? hoursAgo(0.8 + (index % 8))
        : null,
      expiresAt: status === "pending"
        ? hoursFromNow(8 + (index % 12))
        : null,
    };
  });

  await db.insert(recoveryAttempts).values(attemptsToInsert);

  const auditRows: typeof recoveryAuditEvents.$inferInsert[] = [];

  for (const attempt of attemptsToInsert) {
    const diagnosis = attempt.failureReason.toLowerCase();

    auditRows.push(
      {
        id: `${attempt.id}_detected`,
        recoveryAttemptId: attempt.id,
        type: "detected",
        title: "Checkout attempt detected",
        description: `Razorpay reported a ${attempt.failureCode} event for ${attempt.paymentMethod}.`,
        timestamp: attempt.detectedAt,
        actor: "Razorpay webhook",
        meta: attempt.failureCode,
      },
      {
        id: `${attempt.id}_diagnosed`,
        recoveryAttemptId: attempt.id,
        type: "diagnosed",
        title: "Failure diagnosed",
        description: `The recovery engine classified this as ${diagnosis}.`,
        timestamp: new Date(
          attempt.detectedAt.getTime() + 30_000,
        ),
        actor: "ReCart rules engine",
        meta: "confidence: 0.91",
      },
      {
        id: `${attempt.id}_action`,
        recoveryAttemptId: attempt.id,
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
    );

    if (attempt.status === "recovered") {
      auditRows.push({
        id: `${attempt.id}_outcome`,
        recoveryAttemptId: attempt.id,
        type: "outcome",
        title: "Payment recovered",
        description: `₹${Number(attempt.amount).toLocaleString("en-IN")} captured successfully.`,
        timestamp: attempt.recoveredAt ?? attempt.lastActionAt,
        actor: "Razorpay webhook",
        meta: "payment.captured",
      });
    }
  }

  await db.insert(recoveryAuditEvents).values(auditRows);
  await getConfig();
}

async function getSummary() {
  const attempts = await getAttempts();

  const atRisk = attempts.reduce(
    (total, attempt) => total + attempt.amount,
    0,
  );

  const recovered = attempts
    .filter((attempt) => attempt.status === "recovered")
    .reduce((total, attempt) => total + attempt.amount, 0);

  const recoveredCount = attempts.filter(
    (attempt) => attempt.status === "recovered",
  ).length;

  const pendingCount = attempts.filter(
    (attempt) => attempt.status === "pending",
  ).length;

  const escalatedCount = attempts.filter(
    (attempt) => attempt.status === "escalated",
  ).length;

  const labels = [
    "18 Aug",
    "19 Aug",
    "20 Aug",
    "21 Aug",
    "22 Aug",
    "23 Aug",
    "24 Aug",
  ];

  const trend = labels.map((label, index) => ({
    label,
    recovered: Math.round(recovered * (0.54 + index * 0.07)),
    atRisk: Math.round(atRisk * (0.58 + index * 0.06)),
  }));

  return {
    recovered,
    atRisk,
    recoveryRate: atRisk
      ? Number(((recovered / atRisk) * 100).toFixed(1))
      : 0,
    totalAttempts: attempts.length,
    recoveredCount,
    pendingCount,
    escalatedCount,
    trend,
  };
}

async function createAudit(attempt: RecoveryAttempt): Promise<void> {
  const diagnosis = attempt.failureReason.toLowerCase();

  const events: typeof recoveryAuditEvents.$inferInsert[] = [
    {
      id: `${attempt.id}_detected`,
      recoveryAttemptId: attempt.id,
      type: "detected",
      title: "Checkout attempt detected",
      description: `Razorpay reported a ${attempt.failureCode} event for ${attempt.paymentMethod}.`,
      timestamp: new Date(attempt.detectedAt),
      actor: "Razorpay webhook",
      meta: attempt.failureCode,
    },
    {
      id: `${attempt.id}_diagnosed`,
      recoveryAttemptId: attempt.id,
      type: "diagnosed",
      title: "Failure diagnosed",
      description: `The recovery engine classified this as ${diagnosis}.`,
      timestamp: new Date(
        new Date(attempt.detectedAt).getTime() + 30_000,
      ),
      actor: "ReCart rules engine",
      meta: "confidence: 0.91",
    },
    {
      id: `${attempt.id}_action`,
      recoveryAttemptId: attempt.id,
      type: "action",
      title: attempt.lastAction,
      description:
        attempt.status === "recovered"
          ? "The customer completed payment through the generated recovery link."
          : `A bounded ${attempt.channel.toLowerCase()} nudge was sent with a fresh payment link.`,
      timestamp: new Date(attempt.lastActionAt),
      actor: "ReCart agent",
      meta: `attempt ${attempt.attempts} of ${attempt.maxAttempts}`,
    },
  ];

  if (attempt.status === "recovered") {
    events.push({
      id: `${attempt.id}_outcome`,
      recoveryAttemptId: attempt.id,
      type: "outcome",
      title: "Payment recovered",
      description: `₹${attempt.amount.toLocaleString("en-IN")} captured successfully.`,
      timestamp: new Date(
        attempt.recoveredAt ?? attempt.lastActionAt,
      ),
      actor: "Razorpay webhook",
      meta: "payment.captured",
    });
  }

  await db.insert(recoveryAuditEvents).values(events);
}

async function initialize(): Promise<void> {
  await seedDatabase();
}

void initialize().catch((error) => {
  console.error("Failed to initialize recovery database", error);
});

router.get("/recovery/summary", async (_req, res) => {
  const summary = await getSummary();
  res.json(GetRecoverySummaryResponse.parse(summary));
});

router.get("/recovery/attempts", async (_req, res) => {
  const attempts = await getAttempts();
  res.json(GetRecoveryAttemptsResponse.parse(attempts));
});

router.get("/recovery/attempts/:id", async (req, res) => {
  const { id } = GetRecoveryAttemptParams.parse(req.params);

  const rows = await db
    .select()
    .from(recoveryAttempts)
    .where(eq(recoveryAttempts.id, id))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Recovery attempt not found" });
    return;
  }

  const attempt = toRecoveryAttempt(rows[0]);

  const auditRows = await db
    .select()
    .from(recoveryAuditEvents)
    .where(eq(recoveryAuditEvents.recoveryAttemptId, id))
    .orderBy(recoveryAuditEvents.timestamp);

  const audit = auditRows.map(toAuditEvent);

  res.json(
    GetRecoveryAttemptResponse.parse({
      ...attempt,
      audit,
    }),
  );
});

router.post("/recovery/attempts/:id/retry", async (req, res) => {
  const { id } = RetryRecoveryAttemptParams.parse(req.params);

  const rows = await db
    .select()
    .from(recoveryAttempts)
    .where(eq(recoveryAttempts.id, id))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Recovery attempt not found" });
    return;
  }

  const existing = toRecoveryAttempt(rows[0]);
  const config = await getConfig();

  if (
    existing.attempts >=
    Math.min(config.maxAttempts, existing.maxAttempts)
  ) {
    res.status(400).json({
      error: "Retry limit reached for this order",
    });
    return;
  }

  const timestamp = new Date();
  const nextAttempts = existing.attempts + 1;
  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: Math.round(existing.amount * 100),
    currency: existing.currency,
    receipt: `recart_recovery_${id}_${nextAttempts}`,
    notes: {
      recoveryAttemptId: id,
      source: "ReCart AI Revenue Recovery",
    },
  });
  const nextChannel = nextAttempts % 2 === 0
    ? "WhatsApp"
    : "Email";

  await db
    .update(recoveryAttempts)
    .set({
      attempts: nextAttempts,
      status: "pending",
      channel: nextChannel,
      lastAction: "Fresh payment link generated",
      lastActionAt: timestamp,
      expiresAt: hoursFromNow(config.windowHours),
      razorpayOrderId: order.id,
    })
    .where(eq(recoveryAttempts.id, id));

  await db.insert(recoveryAuditEvents).values({
    id: `${id}_retry_${nextAttempts}`,
    recoveryAttemptId: id,
    type: "action",
    title: "Fresh payment link generated",
    description: `Retry ${nextAttempts} of ${existing.maxAttempts} sent via ${nextChannel}.`,
    timestamp,
    actor: "ReCart agent",
    meta: `cooldown: ${config.cooldownMinutes} minutes`,
  });

  const updatedRows = await db
    .select()
    .from(recoveryAttempts)
    .where(eq(recoveryAttempts.id, id))
    .limit(1);

  const updated = toRecoveryAttempt(updatedRows[0]);

  res.json(RetryRecoveryAttemptResponse.parse(updated));
});

router.get("/recovery/activity", async (_req, res) => {
  const rows = await db
    .select()
    .from(recoveryAuditEvents)
    .orderBy(desc(recoveryAuditEvents.timestamp))
    .limit(10);

  const activity = rows.map((event) => ({
    id: event.id,
    title: event.title,
    detail: event.description,
    timestamp: event.timestamp.toISOString(),
    tone:
      event.type === "outcome"
        ? "success"
        : event.type === "action"
          ? "info"
          : event.type === "detected"
            ? "neutral"
            : "warning",
  }));

  res.json(GetRecoveryActivityResponse.parse(activity));
});

router.get("/recovery/config", async (_req, res) => {
  const config = await getConfig();
  res.json(GetRecoveryConfigResponse.parse(config));
});

router.patch("/recovery/config", async (req, res) => {
  const newConfig = UpdateRecoveryConfigBody.parse(req.body);

  await db
    .insert(recoveryConfig)
    .values({
      id: 1,
      ...newConfig,
    })
    .onConflictDoUpdate({
      target: recoveryConfig.id,
      set: newConfig,
    });

  res.json(UpdateRecoveryConfigResponse.parse(newConfig));
});

router.post("/recovery/simulate", async (_req, res) => {
  const config = await getConfig();
  const attempts = await getAttempts();

  const index = attempts.length;
  const blueprint = blueprints[index % blueprints.length];
  const timestamp = new Date();

  const id = `rc_${Date.now()}`;

  await db.insert(recoveryAttempts).values({
    id,
    customer: blueprint.customer,
    email: blueprint.email,
    amount: String(blueprint.amount + 375),
    currency: "INR",
    failureReason: blueprint.failureReason,
    failureCode: blueprint.failureCode,
    channel: blueprint.channel,
    status: "pending",
    attempts: 1,
    maxAttempts: config.maxAttempts,
    detectedAt: timestamp,
    lastAction: "Fresh payment link sent",
    lastActionAt: timestamp,
    paymentMethod: blueprint.paymentMethod,
    recoveredAt: null,
    expiresAt: hoursFromNow(config.windowHours),
  });

  const attemptRows = await db
    .select()
    .from(recoveryAttempts)
    .where(eq(recoveryAttempts.id, id))
    .limit(1);

  const attempt = toRecoveryAttempt(attemptRows[0]);

  await createAudit(attempt);

  const summary = await getSummary();

  res.status(201).json(
    SimulateRecoveryAttemptResponse.parse({
      attempt,
      summary,
    }),
  );
});

export default router;