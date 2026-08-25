# Grant Review Recusal Graph

A GenLayer-native workbench that reaches validator consensus on public conflict evidence before a grant-review assignment can become active.

## Verified links

- Studionet contract: [`0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8`](https://explorer-studio.genlayer.com/address/0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8)
- Deployment transaction: `0x895e0b704553eea0a84c960bef8e2efaafd8ac25f29d5280f405f14863b052b8`
- [Exact transaction evidence and live proof matrix](docs/VERIFICATION.md)
- Live web app: added after the reviewed Vercel deployment

## Trust problem

Grant administrators choose reviewers, reviewers self-declare relationships, and public research records are fragmented and ambiguous. Any one party could omit a relationship, interpret a name match selectively, or change an off-chain spreadsheet without leaving an authoritative explanation. Applicants and auditors therefore need a decision whose evidence, consequence, and history are not controlled by one administrator, reviewer, server, or model response.

## Why GenLayer is essential

The central decision compares live ORCID identities and employment, PubMed co-authorship, and NIH RePORTER participation. The Intelligent Contract uses `gl.nondet.exec_prompt` for comparative interpretation while deterministic rules bind exact identities, dates, source status, policy consequences, and canonical fingerprints. GenLayer validators must agree before the contract records `RECUSED`, `ELIGIBLE`, `MANUAL_HOLD`, or `EVIDENCE_HOLD` and before that result can affect panel activation. A conventional static frontend cannot provide this consensus-controlled state consequence.

## How it works

1. The **administrator** creates a round with a client nonce, quorum, and deadlines; registers applicants, primaries, and backups; sets assignments; and freezes the cohort.
2. **Applicants and reviewers** acknowledge their registered identity. Reviewers may decline before activation.
3. A **permissionless assessor** requests screening for each required applicant-reviewer pair.
4. Validators compare the public evidence and commit one of five policy outcomes. Finalization reaches `READY` only when requirements pass; unresolved or manual-review evidence produces `HOLD`.
5. Activation keeps an eligible primary or deterministically promotes the first eligible backup while enforcing quorum. The administrator later closes the active round.
6. An **auditor or public observer** reads rounds, pair evidence, effective panels, and append-only events without a wallet.

## Architecture

- `contracts/grant_review_recusal_graph.py` owns policy, authorization, consensus decisions, lifecycle transitions, panel consequences, and audit events.
- GenLayer Studionet is the authoritative state and transaction history.
- `frontend/` is a static React client. It reads the contract directly and sends writes only through the explicitly selected injected wallet. It has no backend, database, indexer, or privileged decision path.
- ORCID, PubMed, and NIH RePORTER are untrusted public evidence sources. Declared institutions are supporting metadata only.

## Intelligent Contract

Actors are the round administrator, registered applicants/reviewers, permissionless assessors, and public readers. Rounds progress through `DRAFT → FROZEN → SCREENING → READY → ACTIVE → CLOSED`; `HOLD` retains unresolved/manual-review rounds and `CANCELLED` terminates a draft.

Key writes are `create_round`, `add_applicant`, `add_reviewer`, `set_assignment`, `acknowledge_identity`, `decline_assignment`, `freeze_round`, `screen_pair`, `finalize_screening`, `activate_panel`, `close_round`, and `cancel_round`. Public views expose rounds, participants, assignments, pair assessments, effective panels, events, nonce resolution, and the upgrader.

Each validator receives bounded, delimiter-isolated evidence. Deterministic validation rejects prompt-injected output, identity mismatch, unusable sources, invalid consequence mappings, and non-canonical results. Validators compare the normalized policy tuple and fingerprint; disagreement cannot mutate authoritative state. The contract transfers no funds: its value consequence is reviewer eligibility, recusal, hold, deterministic backup promotion, and panel activation.

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

Current frontend result: 6 test files / 49 tests passed; TypeScript and ESLint passed with zero errors; production build passed; production dependency audit found zero vulnerabilities. Contract verification: 60 direct tests and 1 pinned-runtime test passed; Ruff, GenVM lint, and dependency checks passed. See [the retained live evidence](docs/VERIFICATION.md).

## Deployment

- Network: GenLayer Studionet (`61999` / `0xf22f`)
- RPC: `https://studio.genlayer.com/api`
- Contract source SHA-256: `271b3ab1bf8d9b985459fe976b805476974a8a79820415e42eafba631fdac626`
- Upgrader: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`

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
