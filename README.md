# Grant Review Recusal Graph

A GenLayer-native workbench that reaches validator consensus on public conflict evidence before a grant-review assignment can become active.

## Verified links

- Studio Next contract: [`0x76cdD2006178858b1c48254B1d09a78c509bC4E7`](https://explorer-studio-dev.genlayer.com/address/0x76cdD2006178858b1c48254B1d09a78c509bC4E7)
- Deployment transaction: `0x22ac54cd04c89ca6a4882361271f658b1bd186d4117b6beca6904f6bad3a56a9`
- [Exact transaction evidence and live proof matrix](docs/VERIFICATION.md)
- Live web app: pending Vercel redeployment for this exact Studio Next binding

## Trust problem

Grant administrators choose reviewers, reviewers self-declare relationships, and public research records are fragmented and ambiguous. Any one party could omit a relationship, interpret a name match selectively, or change an off-chain spreadsheet without leaving an authoritative explanation. Applicants and auditors therefore need a decision whose evidence, consequence, and history are not controlled by one administrator, reviewer, server, or model response.

## Why GenLayer is essential

The central decision compares live ORCID identities and employment, PubMed co-authorship, and NIH RePORTER participation. The Intelligent Contract uses `gl.nondet.exec_prompt` for comparative interpretation while deterministic rules bind exact identities, dates, source status, policy consequences, and canonical fingerprints. GenLayer validators must agree before the contract records `RECUSED`, `ELIGIBLE`, `MANUAL_HOLD`, or `EVIDENCE_HOLD` and before that result can affect panel activation. A conventional static frontend cannot provide this consensus-controlled state consequence.

## How it works

1. The **administrator** creates a round with a client nonce, quorum, and deadlines; registers applicants, primaries, and backups; sets assignments; and freezes the cohort.
2. **Applicants and reviewers** acknowledge their registered identity. Reviewers may decline before activation.
3. A **permissionless assessor** requests the first screening for each required applicant-reviewer pair. If public evidence remains unresolved, only the round administrator can authorize a bounded retry, preventing third parties from exhausting the retry allowance.
4. Validators compare the public evidence and commit one of five policy outcomes. Finalization reaches `READY` only when requirements pass; unresolved or manual-review evidence produces `HOLD`.
5. Activation keeps an eligible primary or deterministically promotes the first eligible backup while enforcing quorum. The administrator later closes the active round.
6. An **auditor or public observer** reads rounds, pair evidence, effective panels, and append-only events without a wallet.

## Architecture

- `contracts/grant_review_recusal_graph.py` owns policy, authorization, consensus decisions, lifecycle transitions, panel consequences, and audit events.
- GenLayer Studio Next is the authoritative state and transaction history for this release.
- `frontend/` is a static React client. It reads the contract directly and sends writes only through the explicitly selected injected wallet. It has no backend, database, indexer, or privileged decision path.
- ORCID, PubMed, and NIH RePORTER are untrusted public evidence sources. Declared institutions are supporting metadata only.

## Intelligent Contract

Actors are the round administrator, registered applicants/reviewers, permissionless assessors, and public readers. Rounds progress through `DRAFT → FROZEN → SCREENING → READY → ACTIVE → CLOSED`; `HOLD` retains unresolved/manual-review rounds and `CANCELLED` terminates a draft.

Key writes are `create_round`, `add_applicant`, `add_reviewer`, `set_assignment`, `acknowledge_identity`, `decline_assignment`, `freeze_round`, `screen_pair`, `finalize_screening`, `activate_panel`, `close_round`, and `cancel_round`. Public views expose rounds, participants, assignments, pair assessments, effective panels, events, nonce resolution, and the upgrader.

Each validator independently refetches bounded, delimiter-isolated evidence and re-derives the canonical decision and explanation. Deterministic validation rejects prompt-injected output, identity mismatch, unusable sources, invalid consequence mappings, non-canonical results, and any leader-controlled explanation that differs from the independently derived text. Disagreement cannot mutate authoritative state. The contract transfers no funds: its value consequence is reviewer eligibility, recusal, hold, deterministic backup promotion, and panel activation.

## Transaction lifecycle

The frontend stores canonical intent before prompting the selected wallet and records the returned hash immediately. It never automatically resubmits after a hash exists. It reconciles that exact hash with bounded polling and accepts success only after GenLayer `FINALIZED`, leader execution `SUCCESS`, non-disagreeing consensus, and action-specific authoritative readback. Missing consensus, missing leader status, readback failure, timeout, and unsupported readback all fail closed.

## Run locally

Prerequisites: Node.js 20+ and npm.

```bash
cd frontend
copy .env.example .env.local
npm ci
npm run dev
```

The environment file contains optional `VITE_GENLAYER_RPC_URL`, `VITE_GENLAYER_EXPLORER_URL`, and `VITE_CONTRACT_ADDRESS` overrides. Defaults point to the verified Studionet deployment; no secret is required for public reads.

## Tests and verification

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
```

Current frontend result: 6 test files / 58 tests passed; TypeScript and ESLint passed with zero errors; production build passed; production dependency audit found zero vulnerabilities. Contract verification: 63 direct tests and 1 pinned-runtime test passed; Ruff, GenVM lint, and dependency checks passed. See [the retained live evidence](docs/VERIFICATION.md).

## Deployment

- Network: GenLayer Studio Next (`61997` / `0xf22d`)
- RPC: `https://studio-dev.genlayer.com/api`
- Contract source SHA-256: `7231400CE1046CBAF2A080DB4CD62197AEAC1F15152EFDE2C99608A52D6E531A`
- Upgrader: `0x8581c4a532dd3f9b163b12809b1bd089f367147f`

The [deployment manifest](deployments/studionet.json) binds constructor, source, transaction, and address. The contract is upgradable through its authorized Root Slot path; reset and authority-loss boundaries plus the separate upgrade rehearsal are documented in [Recovery](docs/RECOVERY.md).

## Security and trust boundaries

- EIP-6963 discovery is restricted to MetaMask, OKX Wallet, and Rabby; writes remain bound to the chosen provider object.
- Reload starts disconnected and never silently restores wallet authorization.
- ORCID checksums and returned identifiers must match before evidence is usable.
- Empty, malformed, oversized, unavailable, or mismatched evidence cannot grant clearance.
- Caps bound rounds, participants, pairs, events, public records, response sizes, and retries.
- Audit events expose title hashes rather than raw titles.

## Known limitations

The contract evaluates only public ORCID employment, PubMed co-authorship, and NIH project evidence. It does not determine private financial interests, family relationships, confidential collaborations, scientific merit, or final funding decisions. Public APIs can be incomplete or unavailable; those conditions intentionally produce a hold rather than eligibility.
