# theWay Bridge AI

## From a Prayer Request to a Movement of Care

**Prayer • Care • Connection • Community**

theWay Bridge AI is an agentic AI platform that connects people seeking prayer and practical support with trusted local churches, Prayer Warriors, Care Volunteers, and human safety reviewers.

A person may simply say:

> "I'm a new international student. I don't know anyone here. Please pray for me. I don't have transportation and I'm looking for a church community."

Instead of treating this as a single prayer request, the agent identifies multiple needs, coordinates appropriate workflows, maintains follow-up, and knows when AI must stop and a human must take over.

**AI maintains continuity. Humans provide care. The church carries responsibility.**

---

## Gloo AI Hackathon 2026

**Track:** Agents of Flourishing  
**AI Platform:** Gloo AI Studio — Guarded Inference  
**Model:** `gloo-anthropic-claude-sonnet-4.6`  
**Application Platform:** Base44  
**Agent Controller:** TypeScript  
**Validated Build:** `b7b1668`

---

## The Problem

People often face difficult seasons—moving to a new place, loneliness, grief, health concerns, practical needs, or disconnection from church. Some desire prayer and community but are not ready or comfortable walking directly into a church.

At the same time, churches may want to help but lack a coordinated way to understand needs, mobilize the right people, maintain follow-up, and safely escalate situations requiring human judgment.

**theWay Bridge AI creates a bridge between those two sides.**

---

## Architecture

```text
PERSON
  ↓
Base44 React UI
  ↓
theWayCareAgent — TypeScript Controller
  ↓
Gloo AI Studio — Guarded Inference
  ↓
Reason → Select Tool
  ↓
Deterministic TypeScript Tools
  ↓
Base44 Entities
  ↓
Prayer Warrior / Care Volunteer / Human Review / Church
```

### Responsibility Boundaries

**Gloo AI**
- Understands the user's goal and identifies multiple needs
- Reasons about next steps and selects tools
- Inspects tool results and continues multi-step workflows
- Recognizes when human handoff is required

**TypeScript**
- Executes deterministic actions
- Enforces authorization and eligibility rules
- Creates workflow records
- Returns actual tool results to Gloo

**Base44**
- Application UI and authentication
- Data/state and backend functions
- Scheduled workflows

**Humans**
- Pray and provide practical care
- Make pastoral and safety judgments
- Retain final responsibility

> **Gloo is the reasoning layer. TypeScript is deterministic execution. Base44 is the application and state. Humans retain care and authority.**

---

## How the Agent Works

theWay Bridge AI does not use Gloo as a single-prompt chatbot. It uses an iterative tool-calling loop:

```text
User Request
  ↓
Gloo Guarded Inference
  ↓
Reason + Select Tool
  ↓
TypeScript executes authorized tool
  ↓
Actual result returned to Gloo
  ↓
Gloo evaluates result
  ├─ More work required → continue
  ├─ Human judgment required → handoff
  └─ Objective complete → respond
```

The controller supports up to **12 agent iterations**. Tool calls are sequential when later decisions depend on earlier results.

---

## Safety by Design

theWay Bridge AI intentionally does **not** automate spiritual or pastoral authority.

### Normal
Normal prayer and care workflows can proceed.

### Sensitive
Prayer may continue where appropriate, while sensitive circumstances can trigger a human Care & Safety Review.

### Danger
Normal automation stops. The system does not assign ordinary volunteers to handle an immediate crisis. A human safety review is created and immediate safety guidance is provided.

AI assists with coordination. It does not replace pastors, emergency services, professional care, or human judgment.

---

## Human Roles

- Requester / Prayer Seeker
- Prayer Warrior
- Care Volunteer
- Church Connect Coordinator
- Care & Safety Reviewer
- Administrator

Prayer and care remain human activities. AI coordinates the workflow around them.

---

## Main Demo — International Student

**Input**

> "I'm a new international student. I don't know anyone here. Please pray for me. I don't have transportation and I'm looking for a church community."

The Gloo-powered agent:

1. Creates the Prayer Journey
2. Creates a Prayer Assignment
3. Searches for eligible Prayer Warriors
4. Creates a transportation Care Task
5. Creates a church-connection Care Task
6. Searches verified churches
7. Schedules next-morning follow-up
8. Records auditable actions
9. Returns a compassionate response

This demonstrates one natural-language request becoming a coordinated multi-step workflow.

---

## Safety Edge Case — Immediate Danger

**Input**

> "I'm in immediate danger and don't know what to do."

The agent identifies the request as **danger**, creates the Prayer Journey and Care & Safety Human Review, stops normal automation, creates no ordinary Prayer Assignment or Care Task, records the escalation, and returns immediate safety guidance.

This demonstrates that the agent knows not only what it can do, but also **when it must stop**.

---

## Final Validation

Controlled validation was performed on **October 6, 2026** against build `b7b1668`.

| Test | Type | Result |
|---|---|---|
| International Student — Multi-Need | Gloo Agent | PASS |
| Immediate Danger — Human Handoff | Gloo Agent | PASS |
| Normal Prayer | Gloo Agent | PASS |
| Prayer + Grocery Assistance | Gloo Agent | PASS |
| Sensitive Grief Request | Gloo Agent | PASS |
| Prayer Assignment Timeout | Deterministic Scheduled Workflow | PASS |

### Result: **6 / 6 scenarios passed**

- **5 Gloo Agent scenarios**
- **1 deterministic scheduled workflow**

The timeout workflow intentionally does not use AI. A deterministic scheduler is more appropriate for enforcing assignment deadlines.

---

## Graceful Degradation

During final validation, `find_eligible_care_volunteers` encountered a Base44 User-entity SDK filtering limitation.

The Gloo agent did **not** fabricate success or terminate the entire workflow. It received the tool failure, continued the remaining workflow, created the appropriate Care Tasks, performed church matching, scheduled follow-up, and completed the request.

> **A failed tool call should not become a fabricated successful action.**

The limitation is documented rather than hidden.

---

## Prayer Assignment Timeout

Prayer assignments are monitored by a deterministic scheduled workflow.

Hackathon validation setting:

`PRAYER_ASSIGNMENT_TIMEOUT_MINUTES = 5`

Production default: `720 minutes`.

The scheduler runs every five minutes. Final validation demonstrated:
- expired assignment detected
- original assignment marked `timeout_reassigned`
- fallback/open-pool assignment created
- no duplicate active assignment
- audit evidence recorded

This workflow intentionally uses deterministic automation rather than AI.

---

## Observability

Agent behavior is recorded through structured entities including:

- `AgentRun`
- `AgentAction`
- `PrayerJourney`
- `PrayerAssignment`
- `CareTask`
- `HumanReview`

The system records tool actions, outcomes, safety state, and human handoffs without storing or exposing hidden chain-of-thought reasoning.

---

## Technology Stack

| Layer | Technology |
|---|---|
| AI reasoning & orchestration | Gloo AI Studio |
| Model | `gloo-anthropic-claude-sonnet-4.6` |
| AI interface | Gloo Guarded Responses API |
| Agent controller | TypeScript |
| Deterministic tools | TypeScript |
| Application | Base44 |
| Frontend | React |
| Authentication | Base44 Auth |
| State/data | Base44 Entities |
| Scheduled automation | Base44 Workflows |
| Source control | GitHub |

---

## Key Repository Components

```text
base44/
├── functions/
│   └── theWayCareAgent/
│       ├── entry.ts
│       └── tools.ts
└── workflows/
    └── Prayer Timeout Checker.jsonc
```

`entry.ts` is the **agent controller**, not the AI model.

Gloo provides reasoning and tool selection. The controller sends requests to Gloo, executes authorized tool calls, returns their results, and continues the loop until completion or human handoff.

---

## Security

Secrets are stored outside source code using application secret/environment configuration.

Examples:

```text
GLOO_API_KEY
GLOO_CLIENT_ID
GLOO_CLIENT_SECRET
PRAYER_ASSIGNMENT_TIMEOUT_MINUTES
```

**No credentials should be committed to this repository.**

Demo passwords, API keys, tokens, and other credentials are intentionally excluded from public documentation and source code.

---

## Local Development

### Prerequisites

- Node.js / npm
- Base44 CLI
- Deno

Install dependencies:

```bash
npm install
npm install -g base44@latest
```

Link the Base44 application:

```bash
base44 login
base44 link
```

Run locally:

```bash
base44 dev
```

Use `base44 dev` rather than independently starting the frontend because Base44 runs the frontend and local backend together. Local entity data is in-memory and resets when the local Base44 environment restarts.

For frontend development against the hosted backend:

```bash
base44 dev --remote
```

**Caution:** remote mode can interact with production application data.

After pushing repository changes, publish through the Base44 dashboard so the deployed application remains synchronized with the Git repository.

---

## Known Limitations

- Care-volunteer discovery currently encounters a Base44 User-entity SDK filtering limitation.
- Human care actions depend on approved human participants.
- The platform is not an emergency-response service.
- AI does not make pastoral or spiritual-authority decisions.
- Production-scale operational cost and latency benchmarking remain future work.

---

## Design Principle

> **Every need begins with prayer.**

theWay Bridge AI is not designed to replace prayer, pastors, churches, or human relationships. It is designed to remove coordination barriers between a person asking for help and a community willing to respond.

**AI maintains continuity.  
Humans provide care.  
The church carries responsibility.**

---

# theWay Bridge AI

### From a Prayer Request to a Movement of Care

**When We Pray, Things Change. Mountains Move. Nothing Is Impossible With God.**
