# RPC Budget

## Applicability

RPC_BUDGET_BASE_SOURCE_REVISION: 2acc8a6492e9b3ca8dff63846d8d3f740d2b77e1
OFFICIAL_DOCS_CHECKED: 2026-09-20 current GenLayer Studio Next and frontend references
STUDIO_SCOPE: RETIRED_NO_RPC_BUDGET_GATE
FRONTEND_SCOPE: APPLICABLE

## STUDIO RPC REQUIREMENTS RETIRED

Studio does not have a request-count, measurement-mode, instrumentation-probe, or RPC evidence gate. The former Studio matrix and capability-probe records are retained only as historical context and are not release criteria. Current deployment and E2E evidence is maintained in the exact-source live case matrix and secret-free receipt/readback ledger required by governance.

Current read-only tool readiness for this revision is recorded in `docs/preflight/studio-next-tool-readiness.json`.

## FRONTEND RPC BUDGET MATRIX
FRONTEND_MATRIX_STATUS: COMPLETE
MULTI_CLIENT_JUSTIFICATION: NOT_REQUIRED

| Screen/workflow | Trigger | RPC method | Cache key / TTL | Polling | Retry/backoff | Invalidation | Authoritative readback | Terminal condition | Max requests | Transactions | Teardown |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| Initial workbench load | round selection or explicit refresh | gen_call view methods | chain, contract, method, normalized args / 8s | none | shared 429/5xx cooldown 3-30s | account, network, contract, successful write | bounded round snapshot | snapshot or visible error | 45 | 0 | hidden document pauses requests |
| Cached tab or pair inspection | tab change or node selection | gen_call | chain, contract, method, normalized args / 8s | none | no automatic retry | same as initial load | existing authoritative snapshot | cached or one response | 1 | 0 | no component poller |
| Wallet connection eligibility | explicit wallet selection | eth_requestAccounts and chain methods | never cached | none | one switch retry only for unknown chain | account or chain change clears eligibility | selected provider account and chain | chain 61999 or visible error | 4 | 0 | listeners removed on disconnect |
| Contract write submission | explicit action click | eth_sendTransaction | never cached | none before hash | no automatic resubmission | successful finalized write clears cache | method-specific gen_call | hash, rejection, or failure | 1 | 1 | single-flight intent blocks duplicates |
| Submitted transaction verification | returned hash or journal reconciliation | gen_getTransaction | hash / 0s | 2.5s exponential to 10s, 10-minute deadline | same-hash transient reads only | terminal result ends polling | one method-specific gen_call | final success, failure, or reconciliation | 90 | 0 | hidden pause and deadline teardown |
| Event pagination | explicit audit page request | gen_call get_event_page | chain, contract, offset, limit / 8s | none, max 20 pages | shared cooldown only | write or explicit refresh | bounded event page | page or visible error | 20 | 0 | no background pagination |

The application uses one shared coordinator, coalesces identical in-flight reads, and never caches authorization, transaction status, or a submitted write. These are adapter-level bounds; physical network counts are measured separately during release E2E.

## FRONTEND RPC BUDGET EVIDENCE

FRONTEND_EVIDENCE_STATUS: NOT_STARTED_FOR_REMEDIATED_RELEASE
