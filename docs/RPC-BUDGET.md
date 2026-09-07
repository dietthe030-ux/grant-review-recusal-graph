# RPC Budget

## Applicability

RPC_BUDGET_REVISION: 1ccef1d9b282ccac67657f0c15d4c8ebe86eea91
OFFICIAL_DOCS_CHECKED: 2026-09-07 current GenLayer governance-routed Studio and frontend references
STUDIO_SCOPE: APPLICABLE
FRONTEND_SCOPE: APPLICABLE

## STUDIO RPC MEASUREMENT CAPABILITY PROBE

STUDIO_CAPABILITY_PROBE_STATUS: COMPLETE
STUDIO_MEASUREMENT_MODE: OBSERVABLE_ACTION_LEDGER
STUDIO_MEASUREMENT_TIMING: PRE_E2E
STUDIO_CAPABILITY_PROBE_AT: 2026-09-07T09:06:15.8158649Z
STUDIO_FIRST_ACTION_AT: 2026-09-07T09:06:15.8158649Z
STUDIO_E2E_STARTED_AT: NOT_STARTED
STUDIO_CAPABILITY_TOOL_OR_API: Codex in-app Browser tool inventory and action receipts
STUDIO_CAPABILITY_CHECK: Checked available Browser control surface before opening Studio; individual physical request events and performance entries are not exposed, while every navigation, interaction, poll, receipt read, readback and transaction tool action is observable.
STUDIO_CAPABILITY_RESULT: Physical network requests are not exposed; primary-AI Studio actions are observable and will be recorded individually.
STUDIO_PHYSICAL_COUNT_SOURCE: NOT_APPLICABLE
STUDIO_PHYSICAL_COUNT_CLAIM: NONE
STUDIO_REPLAY_FOR_MEASUREMENT: NO

## STUDIO RPC BUDGET MATRIX

STUDIO_MATRIX_STATUS: COMPLETE

| Operation/case | RPC method or Studio action | Trigger | Planned maximum | Poll interval / attempts | Retry/cooldown | Terminal condition | Transaction count | Evidence |
|---|---|---|---:|---|---|---|---:|---|
| Account and network lock | Open Studio and inspect selected account/network | Once before PRE_DEPLOY package | 2 | none | none | Public address and Studionet verified | 0 | Browser action ledger and screenshot |
| Exact source/schema envelope | Import existing contract and verify current source/schema | Once before upgrade | 2 | none | no blind reload | 21 methods visible and source SHA bound | 0 | Studio source/schema observation |
| Pre-upgrade authoritative state | get_upgrader and one retained pair assessment | Before upgrade | 2 | none | none | Upgrader and baseline receipt fields returned | 0 | Read-method outputs |
| In-place code upgrade | Upgrade code on existing release contract | After PRE_DEPLOY approval only | 1 | bounded status checks, maximum 24 | stop on terminal/rate limit; never resubmit | Valid hash then FINALIZED, SUCCESS, agreeing consensus | 1 | Transaction hash and terminal receipt |
| Post-upgrade source and state | Source/code check, get_upgrader, retained pair readback | After successful upgrade | 3 | none | none | New source exact; storage baseline preserved | 0 | Studio/Explorer and read outputs |
| Protected retry rejection | Non-admin retry of existing configured EVIDENCE_HOLD pair | One unique negative case | 2 | bounded status checks, maximum 24 | no replay after hash | Finalized rejection and unchanged attempt/explanation | 1 | Hash, receipt, pre/post readback |
| Admin-authorized retry | Admin retry of a clean EVIDENCE_HOLD pair if available; otherwise create smallest fresh case | One unique positive case | 4 | bounded status checks, maximum 24 | no duplicate write; stop on terminal | Finalized success and attempt increments exactly once | 1 | Hash, receipt, readback |

At most three new transactions are planned: one upgrade, one unauthorized rejection, and one authorized retry. Existing valid lifecycle evidence is reused; deterministic combinations are not replayed.

## STUDIO RPC BUDGET EVIDENCE

STUDIO_EVIDENCE_STATUS: PRE_DEPLOY_READ_ONLY_PARTIAL
STUDIO_ACTION_LEDGER_STATUS: ACTIVE
STUDIO_PHYSICAL_REQUESTS: NOT_APPLICABLE
STUDIO_ACTIONS: account selection; exact candidate source import; source-marker verification; validator availability check
STUDIO_TRANSACTIONS: NOT_STARTED
STUDIO_TRANSACTION_HASHES: NOT_STARTED
STUDIO_STATUS_POLL_ATTEMPTS: NOT_STARTED
STUDIO_TERMINAL_RECEIPT_READS: NOT_STARTED
STUDIO_AUTHORITATIVE_READBACKS: NOT_STARTED
STUDIO_RETRIES: NOT_STARTED
STUDIO_DUPLICATE_TRANSACTIONS: NOT_STARTED
STUDIO_MATRIX_VARIANCE: NOT_STARTED

Read-only PRE_DEPLOY actions selected account `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`, imported candidate SHA-256 `6F0293D6B1AFF02B5726FE7A03DD18AE407238B9D07E4670CDF5A64A5B710E4E`, and found the retry-authorization marker at Studio editor line 1409. Studio then reported `Validators: 0`, so it did not expose the parsed method panel; no transaction, signature, replay, or Studio E2E occurred. Transaction evidence fields remain pending until PRE_DEPLOY approval and validator availability.

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
