# ♻️ ReCart — AI Revenue Recovery Agent

> **Recover revenue that would otherwise be lost.**
>
> ReCart is an AI-powered revenue recovery agent for merchants that detects failed payments, explains why they failed, decides the most appropriate recovery action, executes bounded recovery workflows, and verifies whether the revenue was actually recovered.

[![Razorpay](https://img.shields.io/badge/Razorpay-Test%20Mode-blue)](https://razorpay.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791)](https://www.postgresql.org/)

---

## 🎯 Problem

Payment failure does not always mean lost revenue.

A customer may have:

* insufficient funds temporarily
* a failed bank authorization
* a card/network issue
* an expired payment method
* abandoned checkout
* a recoverable payment that simply needs another attempt

Traditional payment systems stop at:

```text
Payment Failed → Merchant Notified
```

The merchant is then expected to manually decide:

* Should I retry?
* When should I retry?
* Should I contact the customer?
* Which channel should I use?
* Should I offer an incentive?
* When should I stop trying?

This creates a gap between **payment failure** and **revenue recovery**.

---

# 💡 ReCart Solution

ReCart turns payment failure into an autonomous, bounded recovery workflow.

```text
Payment Failure
      ↓
Detect Recovery Opportunity
      ↓
Diagnose Failure
      ↓
Evaluate Recovery Potential
      ↓
Generate Recovery Decision
      ↓
Apply Merchant Guardrails
      ↓
Execute Recovery Action
      ↓
Customer Checkout
      ↓
Razorpay Webhook
      ↓
Verify Payment
      ↓
Recovered Revenue
```

The key principle is:

> **AI recommends. Policies control. The system executes. Webhooks verify.**

---

# 🧠 What Makes ReCart Agentic?

ReCart is not simply a dashboard showing failed payments.

The system performs a bounded decision-and-action loop:

### 1. Detect

Identify a failed payment that may be recoverable.

### 2. Diagnose

Understand the failure context and classify the recovery situation.

### 3. Decide

Generate an explainable recommendation covering:

* recovery eligibility
* recommended action
* channel
* retry timing
* incentive
* confidence
* risk
* rationale

### 4. Constrain

Before execution, the recommendation is checked against merchant-configured policies.

### 5. Execute

The permitted recovery action is executed through the appropriate integration.

### 6. Verify

Recovery is not considered successful merely because an action was sent.

The system waits for an authoritative Razorpay payment event.

### 7. Learn from the Outcome

The attempt is updated as:

```text
RECOVERED
FAILED
ESCALATED
```

and the result becomes part of the merchant's recovery history.

---

# 🏗️ Architecture

```text
                         ┌──────────────────────────┐
                         │        MERCHANT          │
                         │     Recovery Console     │
                         │       React + Vite       │
                         └────────────┬─────────────┘
                                      │
                                      │ REST API
                                      ▼
                    ┌─────────────────────────────────┐
                    │          ReCart Backend         │
                    │       Node.js + Express         │
                    │                                 │
                    │  ┌───────────────────────────┐  │
                    │  │     Recovery Engine        │  │
                    │  │                            │  │
                    │  │ Failure diagnosis          │  │
                    │  │ Recovery opportunity       │  │
                    │  │ Evaluation                 │  │
                    │  └─────────────┬─────────────┘  │
                    │                │                │
                    │  ┌─────────────▼─────────────┐  │
                    │  │      Decision Layer        │  │
                    │  │                            │  │
                    │  │ Channel                    │  │
                    │  │ Timing                     │  │
                    │  │ Incentive                  │  │
                    │  │ Confidence                 │  │
                    │  │ Risk                       │  │
                    │  │ Explanation                │  │
                    │  └─────────────┬─────────────┘  │
                    │                │                │
                    │  ┌─────────────▼─────────────┐  │
                    │  │    Policy / Guardrails     │  │
                    │  │                            │  │
                    │  │ Attempt limits             │  │
                    │  │ Cooldown                   │  │
                    │  │ Recovery window            │  │
                    │  │ Incentive cap              │  │
                    │  │ Escalation rules           │  │
                    │  └─────────────┬─────────────┘  │
                    │                │                │
                    │  ┌─────────────▼─────────────┐  │
                    │  │       Audit Trail          │  │
                    │  │                            │  │
                    │  │ Decisions                  │  │
                    │  │ Actions                    │  │
                    │  │ Outcomes                   │  │
                    │  │ Webhook events             │  │
                    │  └────────────────────────────┘  │
                    └───────────────┬─────────────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
        ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐
        │   PostgreSQL   │ │ Notifications  │ │     Razorpay     │
        │                │ │                │ │                  │
        │ Recovery       │ │    Resend      │ │ Payment Links    │
        │ Attempts       │ │    GREEN-API   │ │ Checkout         │
        │ Configuration  │ │                │ │ Payment Events   │
        │ Audit Events   │ │ Email /        │ │ Webhooks         │
        │                │ │ WhatsApp       │ │                  │
        └────────────────┘ └────────────────┘ └────────┬─────────┘
                                                       │
                                                       ▼
                                            ┌────────────────────┐
                                            │ Customer Checkout  │
                                            │                    │
                                            │ Razorpay Payment   │
                                            └─────────┬──────────┘
                                                      │
                                                      │ Payment Event
                                                      ▼
                                            ┌────────────────────┐
                                            │ Webhook Processor  │
                                            │                    │
                                            │ Verify → Reconcile │
                                            │ → Update Attempt   │
                                            └─────────┬──────────┘
                                                      │
                                                      ▼
                                            ┌────────────────────┐
                                            │ Recovery Outcome   │
                                            │                    │
                                            │ RECOVERED          │
                                            │ FAILED             │
                                            │ ESCALATED          │
                                            └─────────┬──────────┘
                                                      │
                                                      ▼
                                            ┌────────────────────┐
                                            │ Dashboard + Audit  │
                                            └────────────────────┘
```

---

# 🔄 End-to-End Recovery Flow

## Step 1 — Payment Failure

A payment fails in Razorpay Test Mode.

```text
Customer
   ↓
Razorpay
   ↓
Payment Failure
   ↓
ReCart
```

The failed payment becomes a potential recovery opportunity.

---

## Step 2 — Recovery Analysis

ReCart evaluates the payment context.

The decision layer produces a structured recommendation such as:

```text
Recovery: Recommended

Reason:
Payment appears recoverable based on the failure context.

Recommended Action:
Create a recovery payment link.

Channel:
WhatsApp / Email

Timing:
Immediate or delayed retry

Incentive:
None / bounded incentive

Confidence:
High

Risk:
Low

Explanation:
The payment failure is considered recoverable and
the selected intervention remains within merchant policy.
```

---

# 🛡️ Bounded Autonomy

ReCart is designed so that AI does **not** have unrestricted authority.

The system separates:

```text
AI Decision
     ↓
Policy Validation
     ↓
Execution
```

Merchant controls can include:

* maximum recovery attempts
* retry cooldown
* recovery window
* maximum incentive
* automation enable/disable
* escalation rules

For example:

```text
AI recommends:
"Offer 10% incentive"

Merchant policy:
Maximum incentive = 5%

Result:
❌ Recommendation rejected
```

This prevents an AI recommendation from directly overriding merchant-defined business rules.

---

# 💳 Razorpay Integration

ReCart integrates with Razorpay to execute and verify the recovery workflow.

### Recovery execution

A failed payment can result in a Razorpay Payment Link being created.

```text
ReCart
  ↓
Razorpay Payment Link API
  ↓
Payment Link
  ↓
Customer
  ↓
Razorpay Checkout
```

### Recovery verification

Once the customer pays, Razorpay sends the relevant payment event to ReCart.

```text
Razorpay
    ↓
payment_link.paid
payment.captured
    ↓
ReCart Webhook
    ↓
Verify Event
    ↓
Find Recovery Attempt
    ↓
Mark Recovered
    ↓
Update Revenue Metrics
```

A recovery is therefore based on **payment confirmation**, not merely on the fact that a notification or payment link was sent.

---

# 📩 Recovery Channels

ReCart supports multiple recovery communication channels.

### Email

Powered through **Resend**.

Used for:

* recovery notifications
* payment links
* customer follow-ups

### WhatsApp

Powered through **GREEN-API**.

Used for:

* recovery messages
* payment links
* customer reminders

The decision layer can select the appropriate channel based on the recovery context and merchant configuration.

---

# 📊 Recovery Console

The merchant dashboard provides a real-time operational view of revenue recovery.

### Key metrics

```text
Revenue At Risk
       ↓
Recoverable Revenue
       ↓
Recovered Revenue
       ↓
Recovery Rate
```

The console also provides visibility into:

* failed payments
* recovery attempts
* active recoveries
* recovered payments
* escalated cases
* recovery decisions
* decision explanations
* audit history

---

# 🔍 Explainability

Every recovery decision is designed to be understandable.

Instead of:

> "AI decided to retry."

ReCart exposes the reasoning behind the action:

```text
WHY

Payment failure is potentially recoverable.

WHAT

Create a recovery payment link.

WHEN

Execute within the configured recovery window.

CHANNEL

WhatsApp.

CONFIDENCE

High.

RISK

Low.

GUARDRAIL CHECK

Passed.

OUTCOME

Pending payment confirmation.
```

This makes the system easier for merchants to trust, audit, and override.

---

# 🧾 Audit Trail

Every important recovery state transition can be recorded.

Example:

```text
21:04:12
Payment failed

21:04:14
Recovery opportunity detected

21:04:15
Recovery decision generated

21:04:15
Policy validation passed

21:04:16
Recovery action executed

21:09:43
Razorpay payment_link.paid received

21:09:44
Payment verified

21:09:44
Recovery marked RECOVERED
```

This gives the merchant a complete view of **what happened, why it happened, and what the outcome was**.

---

# 📁 Repository Structure

```text
recart/
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
│   │       └── app.ts
│   │
│   └── recart-recovery-console/
│       └── src/
│           ├── components/
│           ├── pages/
│           │   ├── recovery.tsx
│           │   ├── attempt-detail.tsx
│           │   └── settings.tsx
│           │
│           ├── App.tsx
│           └── main.tsx
│
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml
│   │
│   ├── api-client-react/
│   │   └── src/
│   │
│   ├── api-zod/
│   │   └── src/
│   │
│   └── db/
│       └── src/
│           └── schema/
│               ├── recovery.ts
│               ├── audit.ts
│               └── index.ts
│
├── scripts/
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

# ⚙️ Technology Stack

| Layer           | Technology        |
| --------------- | ----------------- |
| Frontend        | React + Vite      |
| Backend         | Node.js + Express |
| Language        | TypeScript        |
| Database        | PostgreSQL        |
| API Contract    | OpenAPI + Zod     |
| Payments        | Razorpay          |
| Email           | Resend            |
| WhatsApp        | GREEN-API         |
| Deployment      | Railway           |
| Package Manager | pnpm              |

---

# 🚀 Deployment

ReCart is designed to run as a production-style web application.

```text
                    Internet
                       │
                       ▼
              ┌─────────────────┐
              │     Railway     │
              │                 │
              │  ReCart Server  │
              └────────┬────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
        PostgreSQL          External APIs
                           │
                  ┌────────┼─────────┐
                  ▼        ▼         ▼
               Razorpay  Resend  GREEN-API
```

Environment-specific secrets are kept outside the source code.

Typical configuration includes:

```text
DATABASE_URL
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RESEND_API_KEY
GREEN_API_INSTANCE
GREEN_API_TOKEN
```

---

# 🧪 Test Mode Demo

The current end-to-end recovery flow can be demonstrated using Razorpay Test Mode.

```text
1. Create / simulate failed payment
              ↓
2. ReCart detects recovery opportunity
              ↓
3. Recovery decision generated
              ↓
4. Guardrails validated
              ↓
5. Razorpay Payment Link created
              ↓
6. Customer opens Checkout
              ↓
7. Test payment completed
              ↓
8. Razorpay webhook received
              ↓
9. Payment verified
              ↓
10. Attempt marked RECOVERED
              ↓
11. Dashboard metrics updated
```

This demonstrates the complete loop from **failure → decision → action → payment → verification → recovered revenue**.

---

# 🔐 Security & Reliability Principles

ReCart follows several important principles:

### Server-side execution

Sensitive payment operations are performed by the backend rather than directly from the browser.

### Policy enforcement

Merchant limits are enforced server-side before actions are executed.

### Webhook-driven verification

Recovery is confirmed using payment events rather than trusting client-side state.

### Auditability

Recovery decisions and state transitions can be recorded for review.

### Bounded automation

The agent operates within explicit limits rather than having unrestricted authority over merchant funds or customer communication.

---

# 🎥 Demo Story

The recommended demo follows one failed payment through the complete recovery lifecycle.

### Scene 1 — Revenue at Risk

Show the dashboard.

```text
Revenue At Risk
₹10,000
```

### Scene 2 — Failed Payment

Open the failed payment/recovery attempt.

Show:

* failure context
* customer/payment information
* recovery opportunity

### Scene 3 — AI Decision

Show the explainable recovery recommendation.

```text
Recovery Recommended
Confidence: High
Risk: Low
Channel: WhatsApp
Action: Payment Link
```

### Scene 4 — Guardrail

Show the merchant policy validation.

```text
Attempts: Allowed
Cooldown: Passed
Recovery Window: Passed
Incentive: Within Limit
```

### Scene 5 — Execute

Generate the Razorpay Payment Link and send the recovery intervention.

### Scene 6 — Customer Pays

Open the Razorpay Test Mode checkout and complete the payment.

### Scene 7 — Webhook

Show the incoming Razorpay payment event.

```text
payment_link.paid
        ↓
Verified
        ↓
Recovery Attempt Updated
```

### Scene 8 — Revenue Recovered

Return to the dashboard.

```text
Recovered Revenue
₹10,000

Recovery Status
RECOVERED
```

This tells a complete story:

> **ReCart didn't just detect lost revenue — it acted on it and proved that the revenue came back.**

---

# 🏆 Why ReCart?

Most payment systems answer:

> **"Did the payment succeed?"**

ReCart asks:

> **"If the payment failed, can we recover the revenue — and what is the safest action to take?"**

The system combines:

* AI-powered decision making
* explainable recommendations
* merchant-defined guardrails
* automated recovery execution
* Razorpay payment infrastructure
* multi-channel customer outreach
* webhook-based verification
* auditability
* real-time recovery analytics

The result is a **bounded autonomous revenue recovery system**, rather than another payment failure dashboard.

---

# 🗺️ Future Improvements

Potential extensions include:

* adaptive recovery strategies based on historical outcomes
* merchant-specific recovery policies
* richer customer segmentation
* smarter channel selection
* recovery probability modelling
* automatic escalation to human operators
* additional payment providers
* recovery experiments and A/B testing
* advanced revenue forecasting
* learning from successful and unsuccessful interventions

---

# 👨‍💻 Built For

**Razorpay AI Revenue Recovery Buildathon 2026**

### Track

**AI Revenue Recovery**

### Core Objective

> Detect revenue at risk, determine the right intervention, and execute a bounded recovery workflow.

---

# 📜 License

This project is built as a hackathon / prototype implementation for the Razorpay AI Revenue Recovery Buildathon 2026.
