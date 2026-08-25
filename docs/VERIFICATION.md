# Studionet Verification

Exact source SHA-256: `271b3ab1bf8d9b985459fe976b805476974a8a79820415e42eafba631fdac626`

Contract: `0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8`

Deployment transaction: `0x895e0b704553eea0a84c960bef8e2efaafd8ac25f29d5280f405f14863b052b8`

Every success below was read back after `FINALIZED`, `MAJORITY_AGREE`, and leader `SUCCESS`.
Expected rejection rows were `FINALIZED` with leader `ERROR`, followed by an unchanged authoritative readback.

## Live proof matrix

| Risk / criterion | Transaction | Authoritative result |
|---|---|---|
| Exact deployment | `0x895e...52b8` | Deployed bytes SHA matches; upgrader matches |
| Institutional recusal | `0x6b30...2324` | `CURRENT_INSTITUTIONAL_OVERLAP / RECUSED` |
| Corrected 182,384-byte ORCID | `0x8e02...2fd5` | `NO_PUBLIC_CONFLICT_FOUND / ELIGIBLE`; no false identity mismatch |
| Exact oversized classification | `0x5798...8727` | `UNRESOLVED / EVIDENCE_HOLD / OVERSIZED_RESPONSE` |
| Retry to terminal | `0x4eab...7c44`, `0x35ba...328f` | Attempt 3 remains `EVIDENCE_HOLD / OVERSIZED_RESPONSE` |
| Happy lifecycle finalize | `0x7bbe...970` | `READY` |
| Happy lifecycle activate | `0xb89a...da1c` | `ACTIVE`; two primary assignments |
| Happy lifecycle close | `0xe94e...2684` | `CLOSED`; fingerprint `00dc58...b58c` |
| Duplicate nonce rejection | `0x875c...4b23` | Rejected; round state unchanged |
| Unauthorized write rejection | `0x1a00...7bf4` | Rejected; round state unchanged |
| Deterministic backup promotion | `0xea55...564` | Applicant 0 `BACKUP_ACTIVE` reviewer 1; applicant 1 `PRIMARY_ACTIVE` reviewer 0 |
| Assessment replay rejection | `0xb0e2...7a28` | Rejected; attempt and fingerprint unchanged |
| Applicant capacity boundary | `0xef14...f913` | Fifth applicant rejected; count remains 4 |

## Upgrade rehearsal

Separate contract: `0xaD60Ce10E0BA00009DC363686bA9946C6a3C8DBf`

- Deployment `0x9792f0...75a4`: exact source SHA, finalized consensus success.
- Pre-upgrade state creation `0xc232d2...d609`.
- Upgrade `0x900d17...ec6a`: finalized consensus success.
- Post-upgrade code SHA is unchanged and exact. Round nonce, title hash, `DRAFT` lifecycle, event count, and upgrader all match their pre-upgrade readbacks.

## Local verification

- Direct tests: 60 passed.
- Pinned-runtime tests: 1 passed.
- Ruff: passed.
- GenVM lint: 3 checks passed.
- Dependency check: no broken requirements.

The deployment is Studionet-only. Public ORCID, PubMed, and NIH availability can change; unavailable or unusable evidence fails closed instead of granting clearance.
