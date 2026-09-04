# ReCart — AI Revenue Recovery Console

> **Recover revenue aggressively enough to matter, but conservatively enough to trust.**

ReCart is an **AI-powered revenue recovery console** built for the **Razorpay AI Revenue Recovery Buildathon 2026**.

It detects failed payments, evaluates the recovery opportunity, produces an explainable recovery decision, validates that decision against server-side guardrails, executes an allowed recovery action through customer communication channels, creates a Razorpay Payment Link, and verifies the final payment outcome through Razorpay webhooks.

Instead of treating every failed payment as:

> **Payment failed → Retry**

ReCart asks:

> **Who should we recover? → Why should we recover them? → What should we do next?**

And then closes the loop:

```text
DETECT
  ↓
DIAGNOSE
  ↓
DECIDE
  ↓
EXPLAIN
  ↓
VALIDATE
  ↓
EXECUTE
  ↓
OBSERVE
  ↓
RECOVER / ESCALATE
```

---

# 🚀 The Problem

Revenue loss rarely happens in one clean step.

A payment can fail because of:

* authentication issues
* insufficient funds
* UPI/payment-method failures
* gateway or network failures
* temporary payment issues
* checkout abandonment
* price hesitation
* repeated unsuccessful attempts

Traditional recovery systems often use a generic approach:

```text
Payment failed
      ↓
Send payment link
      ↓
Retry
```

That ignores the context behind the failure.

It can also lead to:

* unnecessary customer outreach
* repeated retries
* poor customer experience
* wasted recovery effort
* unclear decision-making
* no reliable distinction between attempted and actually recovered revenue

ReCart treats revenue recovery as a **decision-making and execution problem**, not simply a retry problem.

---

# 💡 The Solution

ReCart combines:

1. **Revenue-at-risk detection**
2. **Payment failure diagnosis**
3. **Recovery decisioning**
4. **Explainable reasoning**
5. **Server-side guardrails**
6. **Multi-channel recovery**
7. **Razorpay Payment Links**
8. **Webhook-based payment verification**
9. **Recovery state management**
10. **Auditability and operational analytics**

The complete recovery loop is:

```text
Payment Failure
      ↓
Revenue Risk Detection
      ↓
Failure Diagnosis
      ↓
Recovery Decision
      ↓
Explainable Reason
      ↓
Guardrail Validation
      ↓
Recovery Action
      ↓
Customer Notification
      ↓
Razorpay Payment Link
      ↓
Customer Checkout
      ↓
Razorpay Webhook
      ↓
Payment Verification
      ↓
RECOVERED / FAILED / ESCALATED
      ↓
Dashboard + Audit Trail
```

---

# 🧠 What Makes ReCart Different?

ReCart is not simply a payment-link automation tool.

It introduces an **explainable recovery decision layer** between payment failure and recovery execution.

For each recovery opportunity, ReCart can determine:

### Who should be recovered?

Based on the available payment and recovery context.

### Why should they be recovered?

Based on the diagnosed failure and recovery opportunity.

### What should happen next?

The system selects an appropriate intervention and recovery channel.

### Is the action actually allowed?

Server-side guardrails validate the action before execution.

### Did the recovery work?

Razorpay webhook events provide the final payment outcome.

This creates a closed-loop recovery system rather than a one-way automation.

---

# 🎯 Core Features

## 1. Revenue-at-Risk Detection

ReCart turns failed payments into structured recovery opportunities.

Each opportunity can track:

* customer
* transaction
* amount
* failure reason
* failure code
* payment method
* recovery status
* retry count
* recovery channel
* decision
* intervention
* final outcome

This gives merchants a prioritized view of revenue that may still be recoverable.

---

# 2. Explainable Recovery Decision

The recovery engine produces a structured decision rather than an opaque score.

A decision can contain:

* diagnosis
* recommended channel
* retry delay
* incentive
* recovery recommendation
* escalation recommendation
* confidence
* risk level
* reasoning
* guardrail state

Example:

```text
Diagnosis:
Price hesitation

Decision:
Recover through WhatsApp

Confidence:
79%

Intervention:
5% bounded incentive

Reason:
Price hesitation may respond to a bounded incentive.

Risk:
MEDIUM
```

The operator can see **why** the system reached the decision.

---

# 3. Bounded Agentic Workflow

The most important architectural principle in ReCart is:

> **Decision authority is not execution authority.**

The recovery engine can recommend an action.

The backend decides whether that action is permitted.

```text
DETECT
  ↓
EVALUATE
  ↓
RECOMMEND
  ↓
VALIDATE AGAINST POLICY
  ↓
EXECUTE ALLOWED ACTION
  ↓
OBSERVE RESULT
```

This prevents an AI decision from directly becoming unlimited financial automation.

---

# 4. Server-Side Guardrails

Recovery actions are bounded by explicit backend policies.

Current live policy:

| Guardrail         |         Value |
| ----------------- | ------------: |
| Maximum attempts  |         **3** |
| Retry cooldown    | **5 minutes** |
| Recovery window   |  **24 hours** |
| Maximum incentive |       **10%** |
| Automation        |   **Enabled** |

These constraints are enforced by the backend.

They are not merely UI recommendations.

### Example

Once an attempt reaches:

```text
Attempt 3 / 3
```

a further retry is rejected.

The system then escalates the case:

```text
ESCALATED
↓
Flagged for human follow-up
```

This demonstrates **bounded autonomy** in an actual recovery workflow.

---

# 5. Multi-Channel Recovery

ReCart supports multiple customer recovery channels.

### Email

Recovery notifications are sent using **Resend**.

### WhatsApp

Recovery notifications are sent using **GREEN-API**.

The notification layer is separated from the decision layer so recovery decisions are not tightly coupled to a particular communication provider.

The system can therefore determine:

```text
Decision
   ↓
Channel
   ↓
Notification Provider
   ↓
Recovery Link
```

---

# 6. Razorpay Payment Links

When a recovery action is permitted, ReCart creates a **Razorpay Payment Link**.

The customer can then complete the payment through Razorpay Checkout.

Importantly:

> **Creating a Payment Link does not mean the revenue was recovered.**

ReCart only records recovered revenue after the payment outcome is confirmed.

---

# 7. Webhook-Driven Recovery Verification

The recovery workflow continues after the notification is sent.

```text
Payment Link Created
        ↓
Customer Checkout
        ↓
Payment Completed
        ↓
Razorpay Event
        ↓
Webhook Received
        ↓
Webhook Processed
        ↓
Recovery Attempt Updated
        ↓
Revenue Marked Recovered
```

The tested recovery flow includes Razorpay payment events such as:

```text
payment_link.paid
payment.captured
```

This ensures that the dashboard reflects **actual payment outcomes**, rather than assuming that an attempted recovery succeeded.

---

# 8. Recovery State Management

Each recovery opportunity moves through explicit states.

Examples include:

```text
RECOVERABLE
     ↓
ATTEMPTED
     ↓
PAYMENT LINK CREATED
     ↓
NOTIFICATION SENT
     ↓
RECOVERED
```

Or, when automation reaches its limit:

```text
RECOVERABLE
     ↓
ATTEMPTED
     ↓
ATTEMPTED
     ↓
ATTEMPTED
     ↓
ESCALATED
```

This makes the lifecycle visible to both the merchant and the system.

---

# 9. Audit Trail

Every important recovery event is recorded.

Examples include:

* payment failure detected
* failure diagnosed
* recovery decision generated
* recovery action requested
* recovery action allowed
* recovery notification sent
* recovery notification blocked
* payment link generated
* payment recovered
* retry limit reached
* recovery escalated
* human follow-up required

The resulting chain is:

```text
Payment
   ↓
Diagnosis
   ↓
Decision
   ↓
Reason
   ↓
Policy Validation
   ↓
Action
   ↓
Payment Event
   ↓
Outcome
```

This makes the system **observable, explainable, and auditable**.

---

# 🔄 End-to-End Recovery Example

## Example A — Successful WhatsApp Recovery

A failed payment is identified as a recovery opportunity.

```text
Customer:
Ananya Sen

Amount:
₹9,365

Diagnosis:
Price hesitation

Decision:
WhatsApp

Confidence:
79%

Retry:
2 / 3
```

ReCart:

1. Evaluates the failed payment
2. Produces an explainable recovery decision
3. Validates the action against guardrails
4. Generates a Razorpay Payment Link
5. Sends the recovery notification through GREEN-API
6. Customer completes checkout
7. Razorpay sends the payment event
8. ReCart processes the webhook
9. The recovery attempt becomes `RECOVERED`
10. ₹9,365 is added to recovered revenue

The important distinction is:

```text
Action executed ≠ Revenue recovered
```

Revenue is only counted after confirmation.

---

# Example B — Successful Email Recovery

Another failed payment is routed through Email.

```text
Customer:
Rohan Iyer

Amount:
₹18,775

Failure:
UPI collect not accepted

Decision:
Email

Provider:
Resend
```

The customer completes the Razorpay checkout.

The corresponding payment event is processed.

The recovery attempt becomes:

```text
RECOVERED
```

and the confirmed amount contributes to recovered revenue.

---

# Example C — Guardrail Enforcement

A recovery opportunity reaches the maximum permitted attempts.

```text
Customer:
Kabir Rao

Amount:
₹22,365

Attempts:
3 / 3

Status:
ESCALATED
```

A fourth retry is requested.

The backend rejects it:

```text
Retry limit reached for this order
```

The recovery workflow then moves to:

```text
ESCALATED
```

with:

```text
Flagged for human follow-up
```

No fourth automated recovery action is created.

This demonstrates that the system can **stop itself** when the recovery policy says it should.

---

# 📊 Recovery Console

ReCart provides a merchant-facing control room for monitoring recovery performance.

The dashboard surfaces:

* total exposed revenue
* recovered revenue
* still-recoverable revenue
* escalated revenue
* recovery rate
* active recovery attempts
* customer/payment context
* failure diagnosis
* selected channel
* retry progress
* risk
* latest activity
* recovery outcomes

Example workspace:

```text
Total exposed       ₹1,87,867
Recovered             ₹59,744
Still recoverable     ₹39,969
Escalated             ₹88,154
```

The dashboard intentionally separates:

**Confirmed recovered revenue**

from:

**Revenue still recoverable**

and:

**Revenue requiring human intervention**

This prevents recovery actions from being confused with actual business outcomes.

---

# 🏗️ Architecture

```text
                         ┌─────────────────────┐
                         │   Recovery Console  │
                         │      Frontend       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Recovery API     │
                         │      Backend        │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
       ┌─────────────┐       ┌─────────────┐       ┌──────────────┐
       │  Decision   │       │  Guardrails │       │ Audit Trail  │
       │   Engine    │       │             │       │              │
       └──────┬──────┘       └─────────────┘       └──────────────┘
              │
              ▼
       ┌─────────────────┐
       │ Notification    │
       │     Layer       │
       └────────┬────────┘
                │
         ┌──────┴───────────┐
         │                  │
         ▼                  ▼
     ┌────────┐        ┌───────────┐
     │ Resend │        │ GREEN-API │
     │ Email  │        │ WhatsApp  │
     └────────┘        └───────────┘
         │                  │
         └────────┬─────────┘
                  │
                  ▼
          ┌─────────────────┐
          │ Razorpay        │
          │ Payment Link    │
          └────────┬────────┘
                   │
                   ▼
          Customer Checkout
                   │
                   ▼
          ┌─────────────────┐
          │ Razorpay        │
          │ Payment Events  │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ ReCart Webhook  │
          │ Processor       │
          └────────┬────────┘
                   │
                   ▼
          Recovery Outcome
                   │
                   ▼
          Dashboard + Audit
```

---

# 🧩 System Components

## Recovery Engine

Evaluates failed payment opportunities and determines whether recovery is appropriate.

## Decision Layer

Produces the structured recovery recommendation, diagnosis, confidence, risk, intervention and reasoning.

## Policy / Guardrail Layer

Validates whether the recommended recovery action is permitted.

Examples:

* maximum retry attempts
* cooldown period
* recovery window
* incentive limits
* escalation conditions

## Notification Layer

Routes recovery communication through supported providers.

Currently:

* Resend
* GREEN-API

## Razorpay Integration

Handles:

* Payment Link creation
* payment checkout
* payment status
* payment events

## Webhook Processor

Receives and processes Razorpay payment events and updates the corresponding recovery state.

## Recovery Dashboard

Provides merchant visibility into:

* revenue exposure
* recovery decisions
* recovery attempts
* confirmed recoveries
* escalations
* recent activity
* operational state

---

# 🔐 Safety & Reliability

Financial automation requires more than a good AI recommendation.

ReCart therefore follows a **bounded automation** model.

### AI decides within constraints

The recovery engine can recommend an action, but it does not have unrestricted authority.

### Server-side enforcement

Recovery limits are enforced by the backend rather than trusted to the frontend.

### Explicit actions

Recovery operations are represented as structured actions instead of allowing arbitrary AI-generated execution.

### Payment success is externally verified

A recovery is not counted simply because:

* a decision was generated
* a notification was sent
* a Payment Link was created

The payment must actually be confirmed.

### Automatic escalation

When automation reaches its permitted boundary, the system stops and flags the case for human follow-up.

### Auditability

Important decisions, actions and outcomes remain traceable.

---

# 📈 Key Metrics

## Total Exposed Revenue

The total value represented by tracked failed-payment opportunities.

## Recovered Revenue

Revenue successfully recovered and confirmed through the payment flow.

## Still Recoverable

Revenue associated with opportunities that can still be acted upon.

## Escalated Revenue

Revenue associated with cases where automated recovery has stopped and human follow-up is required.

## Recovery Rate

```text
Recovered Opportunities
──────────────────────── × 100
Eligible Recovery Opportunities
```

## Recovery Attempts

Number of recovery interventions executed.

---

# 🛠️ Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Recovery Console UI

### Backend

* Node.js
* TypeScript
* Express
* PostgreSQL

### AI / Decisioning

* AI-powered recovery decision and explanation layer
* Structured recovery recommendations
* Confidence and risk assessment

### Payments

* Razorpay Test Mode
* Razorpay Payment Links
* Razorpay Webhooks

### Notifications

* Resend
* GREEN-API

### Deployment

* Railway

---

# 🧪 Testing

The core recovery workflow has been tested end-to-end using **Razorpay Test Mode**.

## Email Recovery

```text
Payment Failure
      ↓
Recovery Decision
      ↓
Resend Notification
      ↓
Razorpay Payment Link
      ↓
Customer Checkout
      ↓
Razorpay Webhook
      ↓
Payment Verification
      ↓
RECOVERED
```

## WhatsApp Recovery

```text
Payment Failure
      ↓
Recovery Decision
      ↓
GREEN-API Notification
      ↓
Razorpay Payment Link
      ↓
Customer Checkout
      ↓
Razorpay Webhook
      ↓
Payment Verification
      ↓
RECOVERED
```

## Guardrail / Escalation

```text
Attempt 2
      ↓
Attempt 3
      ↓
Attempt 4 Requested
      ↓
Backend Rejects Retry
      ↓
ESCALATED
      ↓
Human Follow-up
```

The testing validates that ReCart contains an actual executable recovery workflow rather than only a dashboard or simulated recovery state.

---

# 🖥️ Product Flow

## Merchant

```text
Open Recovery Console
        ↓
View Revenue Exposure
        ↓
Inspect Recovery Opportunity
        ↓
View Diagnosis
        ↓
View AI Decision + Explanation
        ↓
Review Recovery State
        ↓
Track Outcome
```

## Customer

```text
Payment Fails
      ↓
Recovery Notification
      ↓
Razorpay Payment Link
      ↓
Customer Checkout
      ↓
Payment Completed
```

## System

```text
Payment Event
      ↓
Webhook
      ↓
Verification
      ↓
Recovery State Update
      ↓
Revenue Metrics
      ↓
Audit Trail
```

---

# 🧭 Design Principles

### 1. Recover revenue, not just payments

The goal is measurable recovered revenue.

### 2. Explain every decision

Merchants should understand why an intervention was selected.

### 3. Separate intelligence from authority

AI can recommend. Policy determines what may actually execute.

### 4. Automate within boundaries

Recovery automation must have explicit limits.

### 5. Verify outcomes

A recovery action is not equivalent to a successful payment.

### 6. Escalate when automation should stop

The safest action is sometimes to stop and involve a human.

### 7. Make the system auditable

Every important decision and state transition should be traceable.

---

# 🚧 Future Improvements

The architecture is designed to support further evolution, including:

* richer customer-level recovery propensity
* additional communication channels
* smarter intervention selection
* recovery-cost vs recovered-revenue optimization
* merchant-configurable policies
* A/B testing of recovery strategies
* cohort and segment analytics
* adaptive retry timing
* learning from historical recovery outcomes

These are **future extensions**, not dependencies for the current demonstrated recovery workflow.

The long-term goal is to evolve ReCart from a payment recovery workflow into a broader:

> **Revenue Recovery Decision Engine**

---

# 🏆 Why ReCart Fits the AI Revenue Recovery Track

Revenue recovery is not simply about detecting failed payments.

A useful recovery agent should:

```text
DETECT
  ↓
UNDERSTAND
  ↓
DECIDE
  ↓
ACT
  ↓
VERIFY
  ↓
ESCALATE / CONTINUE
```

ReCart implements this loop around a real Razorpay payment workflow.

It combines:

**AI decision-making**

*

**Explainability**

*

**Server-side guardrails**

*

**Multi-channel recovery**

*

**Razorpay Payment Links**

*

**Webhook verification**

*

**Measurable recovery outcomes**

The result is an agentic recovery system that can act autonomously **without being given unlimited authority**.

---

# 📁 Repository Structure

A simplified representation of the project:

```text
recart/
│
├── frontend/
│   └── Recovery Console
│
├── backend/
│   ├── recovery/
│   │   ├── decision
│   │   ├── actions
│   │   └── policies
│   │
│   ├── payments/
│   │   ├── razorpay
│   │   └── webhooks
│   │
│   └── database/
│
├── docs/
│
├── tests/
│
└── README.md
```

> The exact directory structure may vary between development and deployment branches.

---

# ⚙️ Running Locally

Clone the repository:

```bash
git clone <repository-url>
cd recart
```

Install the project dependencies according to the frontend and backend package configuration.

Configure the required environment variables:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

DATABASE_URL=

AI_API_KEY=
```

Start the frontend and backend using the project's development commands.

For webhook testing, expose the backend webhook endpoint through a publicly reachable development URL and configure the corresponding Razorpay webhook.

> Use Razorpay Test Mode credentials for development and demonstration.

---

# 🔗 Live Demo

### Recovery Console

https://recart-console.up.railway.app

### Backend

https://recart.up.railway.app

---

# 📌 Project Status

## Implemented

* Failed payment detection
* Revenue-at-risk tracking
* Recovery opportunity creation
* Failure diagnosis
* Explainable recovery decisioning
* Confidence and risk assessment
* Channel selection
* Bounded recovery actions
* Server-side attempt limits
* Retry cooldown
* Recovery window
* Incentive cap
* Email recovery through Resend
* WhatsApp recovery through GREEN-API
* Razorpay Payment Link generation
* Razorpay Checkout flow
* Razorpay webhook processing
* Confirmed recovery state
* Recovered revenue tracking
* Escalation to human follow-up
* Recovery activity/audit trail
* Live recovery dashboard
* End-to-end Test Mode validation

## Future Evolution

* More sophisticated recovery propensity
* Additional recovery channels
* Adaptive intervention optimization
* Merchant-configurable recovery policies
* A/B testing
* Advanced cohort analytics
* Continuous optimization from recovery outcomes

---

# 🏆 Built For

**Razorpay AI Revenue Recovery Buildathon 2026**

### Track

**AI Revenue Recovery**

### Project

**ReCart — AI Revenue Recovery Console**

---

# One-Line Pitch

> **ReCart turns failed payments into recoverable revenue by deciding who to recover, explaining why, executing a bounded recovery action, and verifying the result end-to-end.**

---

# Final Principle

> **Recover revenue aggressively enough to matter, but conservatively enough to trust.**
