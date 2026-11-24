# Phase 1: Foundation & Native Spike - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-24
**Phase:** 1-Foundation & Native Spike
**Areas discussed:** Repo layout & tooling, Scripture type & look, Spike screen & fallbacks, Schema & event conventions

---

## Repo layout & tooling
- Package manager: pnpm (recommended) / **bun** ✓ / npm
- Tailwind hoisting guard: **isolated linker** ✓ / pin+CI / mobile outside workspaces
- Shared package: **source TS, no build** ✓ / tsup dist / you decide
- Test runner: **Vitest** ✓ / bun test / Jest

## Scripture type & look
- Scripture font: Amiri / Noto Naskh / Scheherazade / **compare in spike** ✓
- UI font: same as Scripture / **IBM Plex Sans Arabic or Noto Sans Arabic** ✓ / system
- Font size: **5-step slider** ✓ / system only / continuous
- Look: **warm, calm, paper-like** ✓ / cool minimal / you decide

## Spike screen & fallbacks
- Reporting: **live self-test rows** ✓ / manual checklist / live + export
- Fallback rule: **timebox then fall back** ✓ / stop and ask / immediate
- Fixtures: **real verses + edge cases** ✓ / synthetic / you decide

## Schema & event conventions
- IDs: **UUIDv7** ✓ / UUIDv4
- Timestamps: **epoch ms UTC** ✓ / ISO strings
- Events: **separate append-only tables** ✓ / one generic table
- Migration test: user asked for clarification (Arabic); chose **checked-in fixture per schema version** ✓ / generate from migrations

## Claude's Discretion
Theme token values, spike-screen layout, folder names, analytics event list.

## Deferred Ideas
None.
