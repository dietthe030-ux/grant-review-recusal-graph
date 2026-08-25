# Grant Review Recusal Graph

Grant Review Recusal Graph is a GenLayer-native workbench for screening grant-review assignments against ambiguous public evidence. Its Intelligent Contract compares ORCID identity and employment records, PubMed co-authorship, and NIH RePORTER participation, then reaches validator consensus on recusal, eligibility, manual review, or an evidence hold.

The React frontend exposes the resulting applicant-reviewer graph, conflict matrix, source-level evidence, deterministic backup promotion, lifecycle controls, and append-only audit events. Public reads require no wallet. Writes use an explicitly selected EIP-6963 provider (MetaMask, OKX Wallet, or Rabby) on GenLayer Studionet.

## Problem

Grant administrators must avoid assigning reviewers with recent collaboration or current institutional overlap, yet the evidence is fragmented, ambiguous, and changes over time. A spreadsheet can record a declaration but cannot independently compare public sources, preserve a consensus result, or prove why a reviewer was recused or promoted.

## Why GenLayer

The core decision requires comparative reasoning over live public web evidence. The Intelligent Contract uses GenLayer nondeterministic execution to interpret ORCID, PubMed, and NIH RePORTER records, while deterministic rules validate identities, dates, source status, consequences, and canonical fingerprints across leader and validator execution. Consensus therefore controls the state transition instead of a frontend, private server, or single model response.

## Actors

- **Round administrator:** creates a round, registers participants, plans assignments, freezes the cohort, finalizes screening, activates the panel, and closes or cancels the round.
- **Applicant and reviewer:** acknowledge their registered identity; reviewers may decline before activation.
- **Permissionless assessor:** requests screening of an applicant-reviewer pair using public evidence.
- **Auditor or public observer:** reads rounds, assessments, effective panels, and append-only events without connecting a wallet.

## End-to-end journeys

1. An administrator creates a round with a client nonce, quorum, and deadlines; adds applicants, primary reviewers, and backups; then sets immutable assignment plans.
2. Participants acknowledge identity and the administrator freezes the cohort.
3. Any assessor screens required pairs. Validators compare exact ORCID identities, PubMed records, and NIH projects and commit one of five policy outcomes.
4. Finalization moves the round to `READY` only when requirements are satisfied; unresolved or manual-review evidence moves it to `HOLD`.
5. Activation deterministically keeps an eligible primary or promotes the first eligible backup while enforcing quorum. The administrator later closes the active round.

## Architecture and sources of truth

- `contracts/grant_review_recusal_graph.py` is the authoritative policy, authorization, lifecycle, consensus, and audit state machine.
- GenLayer Studionet is the authoritative deployed state and transaction history.
- ORCID, PubMed, and NIH RePORTER are untrusted public evidence inputs; declared institutions are supporting metadata only.
- `frontend/` is a static client. It performs public contract reads directly and sends writes only through the user-selected injected provider. It has no backend, database, indexer, or privileged decision path.

## State model

Rounds progress through `DRAFT → FROZEN → SCREENING → READY → ACTIVE → CLOSED`. `HOLD` retains rounds requiring evidence or manual review, and `CANCELLED` is the terminal pre-activation cancellation state. Pair outcomes map to `RECUSED`, `ELIGIBLE`, `MANUAL_HOLD`, or `EVIDENCE_HOLD`; the contract, not the UI, enforces every transition.

## Transaction lifecycle

The frontend persists canonical intent before opening a wallet, records the returned hash immediately, and never automatically resubmits after a hash exists. It polls that exact hash with bounded backoff and accepts success only after GenLayer `FINALIZED`, successful leader execution, non-disagreeing consensus, and action-specific authoritative readback. Missing consensus, missing leader status, failed readback, timeouts, and unsupported actions fail closed.

## Security and integrity

- EIP-6963 discovers only MetaMask, OKX Wallet, and Rabby; each write stays bound to the explicitly selected provider object.
- Reload starts disconnected and does not silently restore wallet authorization.
- ORCID identities are checksum-validated and bound to returned identifiers before evidence is considered.
- Empty, malformed, oversized, unavailable, or mismatched evidence cannot grant clearance.
- Caps bound rounds, participants, pairs, events, evidence records, response sizes, and screening retries.
- Audit events expose title hashes instead of raw round titles.

## Limitations

The contract evaluates only public ORCID employment, PubMed co-authorship, and NIH project evidence. It does not determine private financial interests, family relationships, confidential collaborations, scientific merit, or final funding decisions. Public APIs can be incomplete or unavailable; those conditions intentionally produce a hold rather than eligibility.

## Live deployment

- Network: GenLayer Studionet (`61999` / `0xf22f`)
- Contract: [`0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8`](https://explorer-studio.genlayer.com/address/0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8)
- Deployment transaction: `0x895e0b704553eea0a84c960bef8e2efaafd8ac25f29d5280f405f14863b052b8`
- Exact contract source SHA-256: `271b3ab1bf8d9b985459fe976b805476974a8a79820415e42eafba631fdac626`

## Run locally

```bash
cd frontend
npm ci
npm run dev
```

The frontend defaults to the deployed Studionet contract. Optional overrides are documented in `frontend/.env.example`.

## Verification

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

Contract tests and deployment evidence are documented in [`docs/VERIFICATION.md`](docs/VERIFICATION.md). Recovery and upgrade boundaries are documented in [`docs/RECOVERY.md`](docs/RECOVERY.md).

## Evidence

- [Studionet contract](https://explorer-studio.genlayer.com/address/0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8)
- [Live proof matrix and exact transaction evidence](docs/VERIFICATION.md)
- [Deployment manifest](deployments/studionet.json)
- [Recovery and upgrade rehearsal](docs/RECOVERY.md)

## Trust boundary

Declared institutions are untrusted supporting metadata. Clearance is never inferred from missing, malformed, oversized, or unavailable public evidence; those conditions fail closed to an evidence hold. The project does not evaluate private disclosures, familial relationships, or final funding decisions.
