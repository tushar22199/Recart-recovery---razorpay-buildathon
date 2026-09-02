export type RecoveryDecision = {
  channel: "Email" | "WhatsApp";
  delayMinutes: number;
  incentivePercent: number;
  shouldRecover: boolean;
  shouldEscalate: boolean;
  confidence: number;
  diagnosis: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  guardrail: string;
  reason: string;
};

export type RecoveryAttempt = {
  attempts: number;
  maxAttempts: number;
  failureReason: string;
  failureCode: string;
};

export type Config = {
  maxAttempts: number;
  cooldownMinutes: number;
  windowHours: number;
  discountCap: number;
  enabled: boolean;
};

export function decideRecoveryAction(
  attempt: RecoveryAttempt,
  config: Config,
): RecoveryDecision {
  const reason = attempt.failureReason.toLowerCase();
  const maxAttempts = Math.min(config.maxAttempts, attempt.maxAttempts);
  const retriesRemaining = Math.max(0, maxAttempts - attempt.attempts);

  if (!config.enabled) {
    return {
      channel: "Email",
      delayMinutes: 0,
      incentivePercent: 0,
      shouldRecover: false,
      shouldEscalate: true,
      confidence: 1,
      diagnosis: "Recovery automation disabled",
      riskLevel: "HIGH",
      guardrail: "Merchant recovery policy is disabled",
      reason: "Recovery automation is disabled by merchant policy.",
    };
  }

  if (attempt.attempts >= maxAttempts) {
    return {
      channel: "Email",
      delayMinutes: 0,
      incentivePercent: 0,
      shouldRecover: false,
      shouldEscalate: true,
      confidence: 1,
      diagnosis: "Retry limit reached",
      riskLevel: "HIGH",
      guardrail: `Maximum ${maxAttempts} recovery attempts reached`,
      reason: "Maximum recovery attempts reached.",
    };
  }

  if (
    reason.includes("insufficient funds") ||
    reason.includes("bank decline")
  ) {
    return {
      channel: attempt.attempts >= 1 ? "WhatsApp" : "Email",
      delayMinutes: config.cooldownMinutes,
      incentivePercent: 0,
      shouldRecover: true,
      shouldEscalate: false,
      confidence: 0.91,
      diagnosis: "Bank or funds-related decline",
      riskLevel: "LOW",
      guardrail: `${retriesRemaining} retries remaining; no discount applied`,
      reason: "Payment failure is recoverable with a fresh payment attempt.",
    };
  }

  if (reason.includes("otp") || reason.includes("authentication")) {
    return {
      channel: "WhatsApp",
      delayMinutes: config.cooldownMinutes,
      incentivePercent: 0,
      shouldRecover: true,
      shouldEscalate: false,
      confidence: 0.88,
      diagnosis: "Authentication failure",
      riskLevel: "LOW",
      guardrail: `${retriesRemaining} retries remaining; no discount applied`,
      reason:
        "Authentication failure suggests the customer may retry successfully.",
    };
  }

  if (reason.includes("network") || reason.includes("gateway")) {
    return {
      channel: "Email",
      delayMinutes: config.cooldownMinutes,
      incentivePercent: 0,
      shouldRecover: true,
      shouldEscalate: false,
      confidence: 0.86,
      diagnosis: "Transient gateway or network failure",
      riskLevel: "LOW",
      guardrail: `${retriesRemaining} retries remaining; no discount applied`,
      reason:
        "Transient gateway/network failure is suitable for another payment attempt.",
    };
  }

  if (reason.includes("price hesitation")) {
    const incentive = Math.min(config.discountCap, 5);

    return {
      channel: "WhatsApp",
      delayMinutes: config.cooldownMinutes,
      incentivePercent: incentive,
      shouldRecover: true,
      shouldEscalate: false,
      confidence: 0.79,
      diagnosis: "Price hesitation",
      riskLevel: "MEDIUM",
      guardrail: `${retriesRemaining} retries remaining; incentive capped at ${config.discountCap}%`,
      reason: "Price hesitation may respond to a bounded incentive.",
    };
  }

  return {
    channel: "Email",
    delayMinutes: config.cooldownMinutes,
    incentivePercent: 0,
    shouldRecover: true,
    shouldEscalate: false,
    confidence: 0.72,
    diagnosis: "Unclassified payment failure",
    riskLevel: "MEDIUM",
    guardrail: `${retriesRemaining} retries remaining; no discount applied`,
    reason: "Failure does not match a high-risk recovery category.",
  };
}
