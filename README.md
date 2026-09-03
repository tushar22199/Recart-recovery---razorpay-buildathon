# ReCart — AI Revenue Recovery Console

> **AI Revenue Recovery · Razorpay Buildathon 2026**

**ReCart** is an AI-powered revenue recovery system that detects failed payments, determines the most appropriate recovery intervention, executes that intervention through a bounded workflow, and tracks the outcome end-to-end.

Instead of treating every failed payment the same way, ReCart answers three questions:

**Who should we recover? → Why should we recover them? → What should we do next?**

The system then executes the selected recovery action and verifies whether revenue was actually recovered.

---

## 🚀 The Problem

Payment failures are not always lost customers.

A customer may have:

* insufficient balance temporarily
* a failed bank authorization
* a transient payment failure
* abandoned checkout
* repeated payment attempts
* a payment failure where another attempt is likely to succeed

Traditional recovery systems often use a simple rule:

> **Payment failed → Send payment link**

That approach is inefficient, difficult to explain, and can result in unnecessary customer outreach.

ReCart instead treats recovery as a **decision-making problem**.

---

# 💡 The Solution

ReCart creates a recovery pipeline that combines:

1. **Payment failure detection**
2. **Customer/payment context analysis**
3. **Recovery likelihood assessment**
4. **Explainable intervention selection**
5. **Bounded recovery execution**
6. **Webhook-based payment verification**
7. **Recovery analytics and auditability**

The result is a closed-loop system:

```text
Payment Failure
      ↓
Revenue Risk Detection
      ↓
Recovery Decision
      ↓
Explainable Reason
      ↓
Recovery Action
      ↓
Razorpay Payment Link
      ↓
Customer Checkout
      ↓
Razorpay Webhook
      ↓
Payment Verification
      ↓
Recovered / Failed
      ↓
Dashboard + Audit Trail
```

---

# 🧠 What Makes ReCart Different?

ReCart does not simply automate payment links.

It introduces an **explainable recovery decision layer**.

For every recovery attempt, the system can answer:

> **Why was this customer selected for recovery?**

and

> **Why was this particular intervention chosen?**

A recovery decision can consider signals such as:

* payment failure characteristics
* previous payment behaviour
* retry history
* customer/payment context
* transaction value
* recovery likelihood
* previous recovery outcomes

The decision is converted into a structured recommendation rather than allowing an unrestricted AI agent to take arbitrary actions.

---

# 🎯 Core Features

## 1. Revenue-at-Risk Detection

ReCart identifies failed payments that represent potentially recoverable revenue.

Each failed payment can be treated as a recovery opportunity with information such as:

* customer
* transaction
* amount
* failure status
* recovery status
* number of attempts
* recovery decision
* intervention
* outcome

This allows merchants to prioritize the revenue that is most worth recovering.

---

## 2. Explainable Recovery Decision

The recovery engine evaluates the available payment/customer signals and produces a structured decision.

Example:

```text
Recovery Decision
-----------------
Priority: HIGH
Action: PAYMENT_LINK

Why:
• Payment represents meaningful recoverable revenue
• Customer has demonstrated prior payment activity
• Failure appears suitable for another payment attempt
• No excessive recovery attempts detected
```

The important part is that the system does not stop at a score.

It exposes the **reasoning behind the action**.

---

## 3. Bounded Agentic Workflow

ReCart uses AI where decision-making benefits from intelligence, while keeping execution constrained.

The agent is not given unrestricted access to the payment system.

Instead, it operates within predefined boundaries:

```text
Detect
  ↓
Evaluate
  ↓
Recommend
  ↓
Validate
  ↓
Execute Allowed Action
  ↓
Observe Result
```

This makes the workflow safer, more predictable, and easier to audit.

---

## 4. Razorpay Payment Link Integration

When the recovery policy determines that a payment retry is appropriate, ReCart can create a **Razorpay Payment Link**.

The customer is then able to complete the payment through Razorpay Checkout.

This provides a real end-to-end recovery path rather than a simulated success state.

---

## 5. Webhook-Driven Recovery Verification

Recovery is not considered successful merely because a payment link was created.

ReCart waits for Razorpay's payment events.

The flow is:

```text
Payment Link Created
        ↓
Customer Pays
        ↓
Razorpay Event
        ↓
Webhook Received
        ↓
Webhook Verified
        ↓
Recovery Attempt Updated
        ↓
Payment Marked Recovered
```

This creates a reliable closed-loop recovery system.

---

## 6. Recovery Console

The dashboard provides a merchant-facing view of recovery performance.

Key information includes:

* revenue at risk
* recovered revenue
* recovery attempts
* successful recoveries
* recovery rate
* failed recovery attempts
* payment/recovery status
* individual recovery decisions
* decision explanations

The console is designed to answer:

> **Where is revenue being lost, what are we doing about it, and is it working?**

---

# 🔄 End-to-End Example

Consider a customer whose ₹5,000 payment fails.

### Step 1 — Payment Failure

The original transaction fails.

```text
Transaction: ₹5,000
Status: Failed
```

ReCart creates a recovery opportunity.

---

### Step 2 — Risk Evaluation

The recovery engine evaluates the available context.

```text
Revenue at risk: ₹5,000

Recovery opportunity:
HIGH
```

---

### Step 3 — Decision

The system determines that another payment attempt is appropriate.

```text
Recommended action:
Create Payment Link
```

The decision is accompanied by an explanation.

---

### Step 4 — Recovery Execution

ReCart creates a Razorpay Payment Link.

```text
Recovery Attempt
      ↓
Payment Link
      ↓
Customer Checkout
```

---

### Step 5 — Successful Payment

The customer completes the payment.

Razorpay sends the corresponding webhook event.

---

### Step 6 — Verification

ReCart processes the webhook and updates the recovery attempt.

```text
Recovery Attempt
      ↓
Payment Confirmed
      ↓
Recovered
```

---

### Step 7 — Dashboard Update

The recovered amount is reflected in the recovery metrics.

```text
Revenue at Risk:    ₹5,000
Recovered Revenue:  ₹5,000
Status:             Recovered
```

This means the system measures **actual recovered revenue**, not merely actions taken.

---

# 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      Merchant       │
                    │   Recovery Console  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   ReCart Backend    │
                    │                     │
                    │ Recovery Engine     │
                    │ Decision Layer      │
                    │ Policy Guardrails   │
                    │ Audit Trail         │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
       ┌─────────────────┐          ┌─────────────────┐
       │ Payment Data    │          │ Razorpay APIs   │
       │ & Recovery DB   │          │                 │
       └─────────────────┘          │ Payment Links   │
                                    │ Payments        │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ Razorpay        │
                                    │ Webhooks        │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ ReCart Webhook  │
                                    │ Processor       │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    Recovery Updated
```

---

# 🧩 System Components

## Recovery Engine

Responsible for determining whether a failed payment represents a meaningful recovery opportunity.

## Decision Layer

Produces a structured recovery recommendation and explanation.

## Policy / Guardrail Layer

Ensures recovery actions remain within predefined boundaries.

Examples include:

* limiting unnecessary retries
* avoiding repeated recovery attempts
* requiring valid payment context
* restricting executable actions
* maintaining an auditable decision trail

## Razorpay Integration

Handles:

* Payment Link creation
* payment processing
* payment status
* webhook events

## Webhook Processor

Consumes Razorpay payment events and synchronizes the recovery state.

## Recovery Dashboard

Provides merchant visibility into:

* revenue at risk
* recovery attempts
* successful recoveries
* recovery performance
* individual recovery decisions

---

# 🔐 Safety & Reliability

Financial workflows require more than an AI-generated recommendation.

ReCart therefore follows a **bounded automation** approach.

### AI decides within constraints

The AI/recovery engine can recommend an intervention, but it does not have unrestricted authority.

### Actions are explicit

Recovery actions are represented as structured operations rather than arbitrary instructions.

### Payment success is externally verified

A recovery is only marked successful after the corresponding payment event is received and processed.

### Auditability

Recovery attempts maintain a record of:

```text
Payment
   ↓
Decision
   ↓
Reason
   ↓
Action
   ↓
Payment Event
   ↓
Outcome
```

This makes the system explainable to both merchants and developers.

---

# 📊 Key Metrics

ReCart focuses on metrics that represent actual business value.

### Revenue at Risk

Total value of payment opportunities currently eligible for recovery.

### Recovered Revenue

Revenue successfully recovered through the system.

### Recovery Rate

```text
Recovered Opportunities
──────────────────────── × 100
Eligible Recovery Opportunities
```

### Recovery Attempts

Number of interventions executed.

### Recovery Success

Number of recovery attempts resulting in confirmed payment.

---

# 🛠️ Technology Stack

The project is built as a full-stack recovery system with:

* **Frontend:** Web-based Recovery Console
* **Backend:** API-driven recovery service
* **Database:** Persistent payment/recovery state
* **AI:** Recovery decision and explanation layer
* **Payments:** Razorpay Test Mode
* **Payment Recovery:** Razorpay Payment Links
* **Events:** Razorpay Webhooks
* **Deployment:** Cloud-hosted application infrastructure

---

# 🧪 Testing

The core recovery workflow has been tested end-to-end in Razorpay Test Mode.

The validated flow is:

```text
Failed Payment
      ↓
Recovery Attempt
      ↓
Razorpay Payment Link
      ↓
Checkout
      ↓
payment_link.paid /
payment.captured webhook
      ↓
Webhook Processing
      ↓
Recovery Marked Successful
      ↓
Dashboard Metrics Updated
```

This verifies that the project is not only a dashboard prototype but contains an actual executable recovery workflow.

---

# 🖥️ Product Flow

### Merchant

```text
Open Recovery Console
        ↓
View Revenue at Risk
        ↓
Inspect Recovery Opportunity
        ↓
View AI Decision + Explanation
        ↓
Execute / Review Recovery
        ↓
Track Outcome
```

### Customer

```text
Payment Fails
      ↓
Recovery Link Generated
      ↓
Customer Opens Checkout
      ↓
Payment Completed
      ↓
Confirmation
```

### System

```text
Payment Event
      ↓
Webhook
      ↓
Verification
      ↓
State Update
      ↓
Analytics
```

---

# 🧭 Design Principles

## 1. Recover revenue, not just payments

The goal is measurable recovered revenue.

## 2. Explain every decision

A merchant should understand why a recovery action was recommended.

## 3. Automate within boundaries

AI should operate within explicit business and safety constraints.

## 4. Close the feedback loop

A recovery attempt is only useful if its outcome is observed.

## 5. Prefer real payment events over assumptions

The system uses Razorpay payment events to determine actual recovery success.

## 6. Make the system auditable

Every important decision and state transition should be traceable.

---

# 🚧 Future Improvements

Potential extensions include:

* multi-channel recovery orchestration
* email/SMS/WhatsApp recovery strategies
* smarter customer-level recovery propensity
* intervention optimization
* automatic retry timing
* merchant-configurable recovery policies
* A/B testing of recovery strategies
* recovery-cost vs recovered-revenue optimization
* richer cohort analytics
* continuous learning from recovery outcomes

The long-term goal is to evolve ReCart from a payment recovery workflow into a **revenue recovery decision engine**.

---

# 🏆 Why ReCart Fits the AI Revenue Recovery Track

Revenue recovery is not simply about detecting failed payments.

A useful recovery agent needs to:

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
LEARN
```

ReCart implements this loop around a real payment workflow.

It combines:

**AI decision-making + explainability + bounded execution + Razorpay payments + webhook verification + measurable recovery outcomes.**

That turns a failed payment from a dead-end event into an actionable recovery opportunity.

---

# 📁 Repository Structure

A simplified project structure:

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

> The exact directory structure may vary depending on the deployed branch/version.

---

# ⚙️ Running Locally

Clone the repository:

```bash
git clone <repository-url>
cd recart
```

Install dependencies according to the frontend/backend package configuration.

Configure the required environment variables:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

DATABASE_URL=

# AI provider configuration
AI_API_KEY=
```

Start the application using the project's development commands.

For webhook testing, expose the backend webhook endpoint through a publicly reachable development URL and configure the corresponding Razorpay webhook.

---

# 🔗 Razorpay Test Mode

ReCart is designed to work with **Razorpay Test Mode** during development and demonstration.

No real customer funds are required for the demonstrated recovery flow.

The test environment allows the complete lifecycle to be demonstrated:

```text
Failure
 → Recovery
 → Payment Link
 → Checkout
 → Webhook
 → Recovery Confirmation
```

---

# 📌 Project Status

### Core Recovery Flow

**Implemented**

* Failed payment detection
* Recovery opportunity creation
* Recovery decision
* Explainable decision output
* Payment Link generation
* Razorpay Checkout
* Webhook processing
* Recovery status update
* Recovered revenue tracking
* Dashboard metrics

### Next Evolution

* More sophisticated recovery propensity
* Multi-channel interventions
* Adaptive recovery strategies
* More advanced optimization and experimentation

---

# 👨‍💻 Built For

**Razorpay AI Revenue Recovery Buildathon 2026**

### Track

**AI Revenue Recovery**

### Project

**ReCart — AI Revenue Recovery Console**

---

## One-line Pitch

> **ReCart turns failed payments into recoverable revenue by intelligently deciding who to recover, explaining why, executing a bounded recovery action, and verifying the result end-to-end.**
