# Frontend RPC Budget

FRONTEND_SCOPE: Static React client reading and writing one GrantReviewRecusalGraph contract on GenLayer Studionet.

## FRONTEND RPC BUDGET MATRIX
FRONTEND_MATRIX_STATUS: COMPLETE

| Screen/workflow | Trigger | RPC method | Cache key / TTL | Polling | Retry/backoff | Invalidation | Authoritative readback | Terminal condition | Max requests | Transactions | Teardown |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| Initial workbench load | round selection or explicit refresh | gen_call view methods | chain, contract, method, normalized args / 8s | none | shared 429/5xx cooldown 3-30s | account, network, contract, successful write | bounded round snapshot | snapshot or visible error | 45 | 0 | hidden document pauses requests |
| Cached tab or pair inspection | tab change or node selection | gen_call | chain, contract, method, normalized args / 8s | none | no automatic retry | same as initial load | existing authoritative snapshot | cached or one response | 1 | 0 | no component poller |
| Wallet connection eligibility | explicit wallet selection | eth_requestAccounts and chain methods | never cached | none | one switch retry only for unknown chain | account or chain change clears eligibility | selected provider account and chain | chain 61999 or visible error | 4 | 0 | listeners removed on disconnect |
| Contract write submission | explicit action click | eth_sendTransaction | never cached | none before hash | no automatic resubmission | successful finalized write clears cache | method-specific gen_call | hash, rejection, or failure | 1 | 1 | single-flight intent blocks duplicates |
| Submitted transaction verification | returned hash or journal reconciliation | gen_getTransaction | hash / 0s | 2.5s exponential to 10s, 10-minute deadline | same-hash transient reads only | terminal result ends polling | one method-specific gen_call | final success, failure, or reconciliation | 90 | 0 | hidden pause and deadline teardown |
| Event pagination | explicit audit page request | gen_call get_event_page | chain, contract, offset, limit / 8s | none, max 20 pages | shared cooldown only | write or explicit refresh | bounded event page | page or visible error | 20 | 0 | no background pagination |

The application uses one shared coordinator, coalesces identical in-flight reads, and never caches authorization, transaction status, or a submitted write. These are adapter-level bounds; physical network counts are measured separately during release E2E.
