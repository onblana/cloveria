@AGENTS.md

## Scope
- Deliver only the files and formats the request names. Propose extra files, fallbacks, or a different format in text and wait for approval instead of creating them.
- Never run `npx prettier` or any other formatter that is not configured in this repo. It reformats whole files and buries the real change in unrelated diffs.

## Response style
- Answer with the conclusion and the exact steps only. No background, no rationale, no concept explanations unless asked.
- Do not use placeholder values that look real (IDs, emails, tokens). Look up the real value, or mark it unmistakably as `<FILL_ME>`.
- Before giving a command that rewrites git history, state in one line what it changes beyond the obvious (dates, hashes, branch relationships).

## Deployment constraints
- Deployed to Vercel serverless. Before writing code that needs WebSockets, background/long-running jobs, cron, in-memory state across requests, or local file writes, say so first and propose a serverless-compatible alternative.
- Browser-to-Supabase direct connections (including Realtime) bypass Vercel and are fine; the restriction applies to Next.js server routes only.

## Game code rules
Rationale for each rule is recorded in `docs/design.md` ("결정 사항"); update that doc, not just this list, when a rule changes.
- Never render the tilemap with React DOM. Canvas/WebGL only.
- Keep game rules (crop growth, mutation rolls, pricing) in `src/lib/game/` as pure TypeScript with no DOM or React dependency, so the rendering layer can be swapped.
- Mobile web is the primary target: every action must work by touch, never keyboard-only, and touch targets are at least 44px.
- No dark mode. The palette stays light regardless of the device setting.
- The Maru Buri font has no weight 500 — use 600 for emphasis.
