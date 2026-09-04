import { sendRecoveryNotification } from "../services/recovery-notifications";
import { db } from "@workspace/db";
import {
  recoveryAttempts,
  recoveryAuditEvents,
  recoveryConfig,
} from "@workspace/db/schema";
import { Router, type IRouter } from "express";
import { desc, eq} from "drizzle-orm";
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
import {
  decideRecoveryAction,
  type RecoveryDecision,
  type Config,
} from "../services/recovery-decision";

type RecoveryAttempt = {
  id: string;
  customer: string;
  email: string;
  phone?: string | null;
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
  razorpayPaymentLinkId: string | null;
  razorpayPaymentLinkUrl: string | null;
  decision?: RecoveryDecision;
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
    phone: "+919306643863",
    amount: 21990,
    failureReason: "Insufficient funds",
    failureCode: "BAD_REQUEST_ERROR",
    paymentMethod: "Visa •••• 1108",
    channel: "WhatsApp",
  },
  {
    customer: "Ananya Sen",
    email: "ananya.s@fieldnotes.store",
    phone: "+919306643863",
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
   config?: Config,
): RecoveryAttempt {
  return {
    id: row.id,
    customer: row.customer,
    email: row.email,
    phone: row.phone ?? null,
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
    razorpayPaymentLinkId: row.razorpayPaymentLinkId ?? null,
    razorpayPaymentLinkUrl: row.razorpayPaymentLinkUrl ?? null,
    ...(config
      ? {
          decision: decideRecoveryAction(
            {
              attempts: row.attempts,
              maxAttempts: row.maxAttempts,
              failureReason: row.failureReason,
              failureCode: row.failureCode,
            },
            config,
          ),
        }
      : {}),
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
  const config = await getConfig();

  const rows = await db
    .select()
    .from(recoveryAttempts)
    .orderBy(desc(recoveryAttempts.detectedAt));

  return rows.map((row) => toRecoveryAttempt(row, config));
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
      phone: blueprint.phone ?? null,
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
    const decision = decideRecoveryAction(
      {
        attempts: attempt.attempts,
        maxAttempts: attempt.maxAttempts,
        failureReason: attempt.failureReason,
        failureCode: attempt.failureCode,
      },
      {
        maxAttempts: 3,
        cooldownMinutes: 45,
        windowHours: 24,
        discountCap: 10,
        enabled: true,
      },
    );

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
        meta: `confidence: ${decision.confidence}`,
      },
      {
        id: `${attempt.id}_action`,
        recoveryAttemptId: attempt.id,
        type: "action",
        title: attempt.lastAction,
        description:
          attempt.status === "recovered"
            ? "The customer completed payment through the generated recovery link."
            : `Recovery link generated — ${attempt.channel} channel selected.`,
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
  const pendingAmount = attempts
    .filter((attempt) => attempt.status === "pending")
    .reduce((total, attempt) => total + attempt.amount, 0);

  const escalatedAmount = attempts
    .filter((attempt) => attempt.status === "escalated")
    .reduce((total, attempt) => total + attempt.amount, 0);

  const totalExposed = attempts
    .reduce((total, attempt) => total + attempt.amount, 0);
  /*
   * Build a real 7-day trend from recovery attempts.
   *
   * "Recovered" is counted on the day the payment was recovered.
   * "At risk" is counted on the day the recovery attempt was detected.
   */
  const now = new Date();
  const trend: Array<{
    label: string;
    recovered: number;
    atRisk: number;
  }> = [];

  for (let offset = 6; offset >= 0; offset--) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - offset);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayRecovered = attempts
      .filter((attempt) => {
        if (!attempt.recoveredAt) return false;

        const recoveredAt = new Date(attempt.recoveredAt);

        return recoveredAt >= dayStart && recoveredAt < dayEnd;
      })
      .reduce((total, attempt) => total + attempt.amount, 0);

    const dayAtRisk = attempts
      .filter((attempt) => {
        const detectedAt = new Date(attempt.detectedAt);

        return detectedAt >= dayStart && detectedAt < dayEnd;
      })
      .reduce((total, attempt) => total + attempt.amount, 0);

    trend.push({
      label: dayStart.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      recovered: Math.round(dayRecovered),
      atRisk: Math.round(dayAtRisk),
    });
  }

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
    pendingAmount,
    escalatedAmount,
    totalExposed,
    trend,
  };
}

async function createAudit(attempt: RecoveryAttempt): Promise<void> {
  const diagnosis = attempt.failureReason.toLowerCase();

  const decision = decideRecoveryAction(
    {
      attempts: attempt.attempts,
      maxAttempts: attempt.maxAttempts,
      failureReason: attempt.failureReason,
      failureCode: attempt.failureCode,
    },
    {
      maxAttempts: 3,
      cooldownMinutes: 45,
      windowHours: 24,
      discountCap: 10,
      enabled: true,
    },
  );

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
      meta: `confidence: ${decision.confidence}`,
    },
    {
      id: `${attempt.id}_action`,
      recoveryAttemptId: attempt.id,
      type: "action",
      title: attempt.lastAction,
      description:
        attempt.status === "recovered"
          ? "The customer completed payment through the generated recovery link."
          : `Recovery link generated — ${attempt.channel} channel selected.`,
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

  const config = await getConfig();
  const attempt = toRecoveryAttempt(rows[0], config);

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

  const timestamp = new Date();

  // Recovery window has expired — do not execute another payment action.
  if (
    existing.expiresAt &&
    timestamp >= new Date(existing.expiresAt)
  ) {
    await db
      .update(recoveryAttempts)
      .set({
        status: "escalated",
        lastAction: "Recovery window expired",
        lastActionAt: timestamp,
      })
      .where(eq(recoveryAttempts.id, id));

    await db.insert(recoveryAuditEvents).values({
      id: `${id}_expired`,
      recoveryAttemptId: id,
      type: "action",
      title: "Recovery escalated",
      description:
        "Recovery window expired before another payment attempt could be made.",
      timestamp,
      actor: "ReCart agent",
      meta: "guardrail: Recovery window expired",
    });

    res.status(400).json({
      error: "Recovery window expired. Flagged for human follow-up.",
    });
    return;
  }

  if (
    existing.attempts >=
    Math.min(config.maxAttempts, existing.maxAttempts)
  ) {
    await db
      .update(recoveryAttempts)
      .set({
        status: "escalated",
        lastAction: "Flagged for human follow-up",
        lastActionAt: timestamp,
      })
      .where(eq(recoveryAttempts.id, id));

    await db.insert(recoveryAuditEvents).values({
      id: `${id}_escalated_${timestamp.getTime()}`,
      recoveryAttemptId: id,
      type: "action",
      title: "Recovery escalated",
      description: "Maximum recovery attempts reached.",
      timestamp,
      actor: "ReCart agent",
      meta: `guardrail: Maximum ${Math.min(
        config.maxAttempts,
        existing.maxAttempts,
      )} recovery attempts reached`,
    });

    const updatedRows = await db
      .select()
      .from(recoveryAttempts)
      .where(eq(recoveryAttempts.id, id))
      .limit(1);

    const updated = toRecoveryAttempt(updatedRows[0]);

    res.status(400).json({
      error: "Retry limit reached for this order",
      attempt: updated,
    });
    return;
  }



  // Enforce the recovery cooldown before taking another external action.
  const cooldownMs = config.cooldownMinutes * 60 * 1000;
  const nextRetryAt = new Date(
    new Date(existing.lastActionAt).getTime() + cooldownMs,
  );
  if (timestamp < nextRetryAt) {
    const remainingMs = nextRetryAt.getTime() - timestamp.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    res.status(400).json({
      error: `Recovery cooldown active. Retry available in ${remainingMinutes} minute${
        remainingMinutes === 1 ? "" : "s"
      }.`,
      retryAt: nextRetryAt.toISOString(),
    });
    return;
  }

  const nextAttempts = existing.attempts + 1;

  // Decide before executing any external payment action.
  const decision = decideRecoveryAction(existing, config);

  if (!decision.shouldRecover) {
    await db
      .update(recoveryAttempts)
      .set({
        status: "escalated",
        lastAction: "Flagged for human follow-up",
        lastActionAt: timestamp,
      })
      .where(eq(recoveryAttempts.id, id));

    await db.insert(recoveryAuditEvents).values({
      id: `${id}_escalated_${timestamp.getTime()}`,
      recoveryAttemptId: id,
      type: "action",
      title: "Recovery escalated",
      description: decision.reason,
      timestamp,
      actor: "ReCart agent",
      meta: `guardrail: ${decision.guardrail}`,
    });

    const updatedRows = await db
      .select()
      .from(recoveryAttempts)
      .where(eq(recoveryAttempts.id, id))
      .limit(1);

    const updated = toRecoveryAttempt(updatedRows[0]);

    res.status(400).json({
      error: decision.reason,
      attempt: updated,
    });
    return;
  }

  // Create Razorpay Payment Link only after the decision passes.
  const razorpay = getRazorpayClient();

  let paymentLink;

  try {
    paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(existing.amount * 100),
      currency: existing.currency,
      accept_partial: false,
      description: `Recovery payment for ${existing.customer}`,
      reference_id: `recart_${Date.now()}_${nextAttempts}`,
      customer: {
        name: existing.customer,
        email: existing.email || undefined,
      },
      notify: {
        email: Boolean(existing.email),
        sms: false,
      },
      expire_by: Math.floor(
        hoursFromNow(config.windowHours).getTime() / 1000,
      ),
      reminder_enable: false,
      notes: {
        recoveryAttemptId: id,
        recoveryAttempt: String(nextAttempts),
        source: "ReCart AI Revenue Recovery",
      },
    });
  } catch (error: any) {
    console.error("Razorpay Payment Link creation failed:", {
      statusCode: error?.statusCode,
      error: error?.error,
      description: error?.error?.description,
      reason: error?.error?.reason,
      field: error?.error?.field,
      message: error?.message,
    });

    res.status(error?.statusCode || 500).json({
      error: "Razorpay Payment Link creation failed",
      details: error?.error?.description || error?.message || "Unknown Razorpay error",
    });
    return;
  }

  const nextChannel = decision.channel;

  const notification = await sendRecoveryNotification({
    customer: existing.customer,
    email: existing.email,
    phone: existing.phone ?? null,
    amount: Number(existing.amount),
    currency: existing.currency,
    paymentLink: paymentLink.short_url,
    channel: nextChannel,
    failureReason: existing.failureReason,
  });

  await db
    .update(recoveryAttempts)
    .set({
      attempts: nextAttempts,
      status: "pending",
      channel: nextChannel,
      lastAction: "Recovery payment link generated",
      lastActionAt: timestamp,
      expiresAt: hoursFromNow(config.windowHours),
      razorpayPaymentLinkId: paymentLink.id,
      razorpayPaymentLinkUrl: paymentLink.short_url,
    })
    .where(eq(recoveryAttempts.id, id));

  await db.insert(recoveryAuditEvents).values({
    id: `${id}_retry_${nextAttempts}`,
    recoveryAttemptId: id,
    type: "action",
    title: notification.sent
    ? "Recovery notification sent"
    : "Recovery notification blocked",
    description:
      `Retry ${nextAttempts} of ${existing.maxAttempts} created via ${nextChannel}. ` +
      `Razorpay Payment Link ${paymentLink.id} was generated. ` +
      `${notification.sent
        ? notification.message
        : `Notification was not sent: ${notification.message}`}`,
    timestamp,
    actor: "ReCart agent",
    meta: JSON.stringify({
      paymentLink: paymentLink.id,
      channel: nextChannel,
      notificationSent: notification.sent,
      provider: notification.provider,
      notificationMessage: notification.message,
    }),
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

router.post("/recovery/simulate", async (req, res) => {
  const config = await getConfig();
  const attempts = await getAttempts();

  const requestedCustomer =
    typeof req.query.customer === "string"
      ? req.query.customer.trim()
      : null;

  const blueprint = requestedCustomer
    ? blueprints.find(
        (item) =>
          item.customer.toLowerCase() === requestedCustomer.toLowerCase(),
      )
    : blueprints[attempts.length % blueprints.length];

  if (!blueprint) {
    res.status(404).json({
      error: `No simulation blueprint found for customer "${requestedCustomer}".`,
    });
    return;
  }
  const timestamp = new Date();

  const id = `rc_${Date.now()}`;

  await db.insert(recoveryAttempts).values({
    id,
    customer: blueprint.customer,
    email: blueprint.email,
    phone: blueprint.phone ?? null,
    amount: String(blueprint.amount + 375),
    currency: "INR",
    failureReason: blueprint.failureReason,
    failureCode: blueprint.failureCode,
    channel: blueprint.channel,
    status: "pending",
    attempts: 1,
    maxAttempts: config.maxAttempts,
    detectedAt: timestamp,
    lastAction: "Payment failure simulated",
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

  let attempt = toRecoveryAttempt(attemptRows[0], config);

  if (attempt.decision?.shouldEscalate) {
    await db
      .update(recoveryAttempts)
      .set({
        status: "escalated",
        lastAction: "Flagged for human follow-up",
        lastActionAt: timestamp,
      })
      .where(eq(recoveryAttempts.id, id));

    await db.insert(recoveryAuditEvents).values({
      id: `${id}_escalated`,
      recoveryAttemptId: id,
      type: "action",
      title: "Recovery escalated",
      description: attempt.decision.reason,
      timestamp,
      actor: "ReCart agent",
      meta: `guardrail: ${attempt.decision.guardrail}`,
    });

    const escalatedRows = await db
      .select()
      .from(recoveryAttempts)
      .where(eq(recoveryAttempts.id, id))
      .limit(1);

    attempt = toRecoveryAttempt(escalatedRows[0], config);
  } else {
    await createAudit(attempt);
  }

  const summary = await getSummary();

  res.status(201).json(
    SimulateRecoveryAttemptResponse.parse({
      attempt,
      summary,
    }),
  );
});

  export default router;