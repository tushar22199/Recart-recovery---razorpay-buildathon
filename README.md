# ReCart Recovery Console

### AI Revenue Recovery for Razorpay

**Detect revenue at risk. Decide the right intervention. Recover automatically. Stop safely.**

ReCart is an AI-powered revenue recovery console built for the **Razorpay AI Buildathon**.

It turns failed payment events into bounded, explainable recovery workflows:

**Detect → Diagnose → Decide → Act → Observe → Recover / Escalate**

Instead of blindly retrying failed payments, ReCart evaluates the failure context, selects a recovery strategy, enforces merchant-configured guardrails, creates a fresh Razorpay Payment Link when appropriate, and uses Razorpay webhooks as the source of truth for the final payment outcome.

---

## 🚀 Why ReCart?

Revenue leakage rarely happens in one clean step.

A customer can fail to pay because of:

- OTP or authentication failure
- bank decline
- insufficient funds
- transient gateway/network failure
- payment pending states
- price hesitation

A useful recovery agent cannot simply keep retrying.

It needs to answer:

> **Should we recover this payment, how should we do it, and when should we stop?**

ReCart makes that decision for every recovery attempt.

---

# 🧠 Recovery Intelligence

Every failed payment passes through a bounded decision engine.

The engine evaluates:

- Failure reason
- Failure code
- Previous attempts
- Merchant recovery policy
- Remaining retry budget
- Recovery window
- Discount policy

It produces a structured decision containing:

| Decision | Example |
|---|---|
| Diagnosis | Authentication failure |
| Risk | LOW |
| Channel | WhatsApp |
| Delay | 45 minutes |
| Incentive | 0% |
| Confidence | 88% |
| Recovery | Allowed |
| Guardrail | 1 retry remaining |
| Reason | Authentication failure suggests the customer may retry successfully |

This makes the recovery decision **explainable rather than opaque**.

---

# 🔄 End-to-End Recovery Loop

## 1. Detect

Razorpay sends payment events to ReCart.

Supported events include:

- `payment.failed`
- `payment.captured`
- `payment_link.paid`

---

## 2. Diagnose

The recovery engine classifies the failure.

Examples:

| Failure | Diagnosis | Typical Risk |
|---|---|---|
| Bank decline | Bank or funds-related decline | LOW |
| Insufficient funds | Bank or funds-related decline | LOW |
| OTP timeout | Authentication failure | LOW |
| Network abort | Transient gateway/network failure | LOW |
| Price hesitation | Price hesitation | MEDIUM |
| Unknown failure | Unclassified payment failure | MEDIUM |

---

## 3. Decide

ReCart determines:

**Whether to recover**

**Which channel to use**

**How long to wait**

**Whether an incentive is appropriate**

**Whether escalation is required**

The decision is bounded by merchant policy.

---

## 4. Act

When recovery is allowed, ReCart creates a **fresh Razorpay Payment Link**.

The system never performs unlimited retries.

Each recovery action consumes part of the configured retry budget.

---

## 5. Observe

Razorpay webhooks provide the outcome.

Creating a Payment Link does **not** count as recovered revenue.

Only a confirmed Razorpay payment outcome moves the case to:

```text
RECOVERED

6. Return to the dashboard

Show the recovered revenue and recovery rate.

Explain:

"Revenue only moves into recovered after Razorpay confirms the payment."

7. Show a guardrail

Open a case that has reached the retry limit.

Show:
Maximum 3 recovery attempts reached
        ↓
Recovery stopped
        ↓
Human follow-up
        ↓
Audit event recorded

Finish with:

"ReCart knows when to recover—and when to stop."

🛠️ Tech Stack
Frontend
React
TypeScript
Vite
CSS
Backend
Node.js
TypeScript
Express
Drizzle ORM
Database
PostgreSQL
Payments
Razorpay Test Mode
Razorpay Payment Links
Razorpay Webhooks
Deployment
Railway

📁 Project Structure

workspace/
│
├── artifacts/
│   │
│   ├── api-server/
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── recovery.ts
│   │       │   ├── razorpay.ts
│   │       │   └── razorpay-webhook.ts
│   │       │
│   │       └── services/
│   │           └── recovery-decision.ts
│   │
│   └── recart-recovery-console/
│       └── src/
│           └── pages/
│               └── recovery.tsx
│
└── lib/
    ├── db/
    │   └── src/schema/
    │       ├── recovery.ts
    │       ├── audit.ts
    │       └── webhooks.ts
    │
    ├── api-client-react/
    │
    └── api-zod/


    🎯 Design Principles
    Bounded autonomy

    The agent can act automatically, but only within merchant-defined limits.

    Outcome-based recovery

    A payment is considered recovered only after payment confirmation.

    Explainability

    Every decision exposes its diagnosis, risk, confidence, reason, and guardrail.

    Auditability

    Actions, decisions, escalations, and outcomes are recorded.

    Financial integrity

    Every exposed rupee is attributable to:

    Recovered
    Pending
    Escalated