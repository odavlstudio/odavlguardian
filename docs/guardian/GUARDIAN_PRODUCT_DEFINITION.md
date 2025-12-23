# 🛡️ ODAVL Guardian — Product Definition

## 1. What is ODAVL Guardian?

ODAVL Guardian is a **Market Reality Testing Engine**.

It validates whether **real users can successfully complete real attempts**
inside a product **before the market does**.

Guardian validates **user success**, not system health.

---

## 2. Core Principle

> A product is considered real only when users can successfully complete real attempts inside it.

Anything else is assumption.

---

## 3. What Guardian Tests

Guardian tests **User Attempts**, not pages.

A User Attempt is:
> A single human attempt to achieve a single meaningful goal.

Examples:
- User attempts to sign up
- User attempts to submit a form
- User attempts to switch language
- User attempts to complete checkout

Guardian observes:
- Did the user succeed?
- Did the user fail?
- Did the user experience friction?

---

## 4. Success Model

Each User Attempt results in exactly one outcome:

- SUCCESS → the intended goal was achieved
- FAILURE → the user could not achieve the goal
- FRICTION → the user did not fail, but faced resistance

Guardian must always report reality, not assumptions.

---

## 5. What Guardian Is NOT

Guardian is NOT:
- A crawler
- A linter
- A unit test framework
- A UI snapshot tool
- A coverage checker
- A synthetic demo
- An AI hallucination engine

Any feature that violates this is rejected.

---

## 6. Scope — Guardian v0.1

Guardian v0.1 focuses on validating **one User Attempt only**.

No AI.
No learning.
No payment execution.
No authentication complexity.

Only honest validation of a real user attempt.

This scope is intentionally narrow to protect truth.
