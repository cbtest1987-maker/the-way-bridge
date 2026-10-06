# theWay Bridge AI

## From a Prayer Request to a Movement of Care

**Prayer • Care • Connection • Community**

theWay Bridge AI is an agentic AI platform that helps connect people seeking prayer and practical support with trusted local churches, Prayer Warriors, Care Volunteers, and human safety reviewers.

A person may simply say:

> "I'm a new international student. I don't know anyone here. Please pray for me. I don't have transportation and I'm looking for a church community."

Instead of treating this as a single prayer request, the agent identifies multiple needs, coordinates the appropriate workflows, maintains follow-up, and knows when AI must stop and a human must take over.

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

## Why We Built It

People often face difficult seasons — moving to a new place, loneliness, grief, health concerns, practical needs, or disconnection from church.

Many may desire prayer and community but are not ready or comfortable walking directly into a church.

At the same time, churches often want to help but lack a coordinated way to understand a person's needs, mobilize the right people, maintain follow-up, and safely escalate situations requiring human judgment.

theWay Bridge AI creates a bridge between those two sides.

---

## Architecture

```text
                    PERSON
                       │
                       ▼
                Base44 React UI
                       │
                       ▼
              theWayCareAgent
             TypeScript Controller
                       │
                       ▼
              Gloo AI Studio
              Guarded Inference
                       │
              Reason → Select Tool
                       │
                       ▼
          Deterministic TypeScript Tools
                       │
                       ▼
               Base44 Entities
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Prayer        Care       Human Review
       Warrior     Volunteer      / Church
