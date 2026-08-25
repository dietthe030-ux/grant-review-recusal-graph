# Studionet Verification

Exact source SHA-256: `271b3ab1bf8d9b985459fe976b805476974a8a79820415e42eafba631fdac626`

Contract: `0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8`
Frontend candidate commit: `17a9203a2efc34d6bf5357e53ce1049e3f22aec0`

Deployment transaction: `0x895e0b704553eea0a84c960bef8e2efaafd8ac25f29d5280f405f14863b052b8`

Every success below was read back after `FINALIZED`, `MAJORITY_AGREE`, and leader `SUCCESS`.
Expected rejection rows were `FINALIZED` with leader `ERROR`, followed by an unchanged authoritative readback.

## Live proof matrix

| Risk / criterion | Transaction | Authoritative result |
|---|---|---|
| Exact deployment | `0x895e0b704553eea0a84c960bef8e2efaafd8ac25f29d5280f405f14863b052b8` | Deployed bytes SHA matches; upgrader matches |
| Institutional recusal | `0x6b30ed0ca5ed0569bdbb73d6350703158fa678f0c0864809a9a65836c1772324` | `CURRENT_INSTITUTIONAL_OVERLAP / RECUSED` |
| Corrected 182,384-byte ORCID | `0x8e022920b14cf4d34e28a1ce6205c167c8ff8fad5656539ce45cbca694592fd5` | `NO_PUBLIC_CONFLICT_FOUND / ELIGIBLE`; no false identity mismatch |
| Freeze round | `0xf88a41060af4a29ab9a090156584b9a0d048cd04eeb6ca7e93870b8bdc7d5d87` | `FROZEN` |
| Applicant 0 acknowledgement | `0xe49587b4f6453105f036048ce2cb16dfe73a7486b5a8f401b998d380980c1930` | Identity acknowledged |
| Applicant 1 acknowledgement | `0x64e583e55ba43d2e3953d856a32a98bd0c795d2ebcbdd2dec5db32185652abb6` | Identity acknowledged |
| Reviewer acknowledgement | `0x3a8b5038ee233a8aae9ec7305ca6a1e6d2c9db28b7d4aead02488c62842c5751` | Assignment acknowledged |
| Exact oversized classification | `0x579886f7ea801c24b910b2ee54e87fd5c0aebcbb44ccccb8b305798d2c338727` | `UNRESOLVED / EVIDENCE_HOLD / OVERSIZED_RESPONSE` |
| Retry to terminal | `0x4eabd3d43e0670073b86d1b03d1744116cee898de07bbfea98a8433edcc57c44`, `0x35bacdb297e58393c5ee981a22fa234aabda9b85bcb5e814d4c3122f0314328f` | Attempt 3 remains `EVIDENCE_HOLD / OVERSIZED_RESPONSE` |
| Finalize to HOLD | `0x26aaedbacc5b52d568a19d79670363e82624b31163b9ca4d41016a91cef45b43` | `HOLD`; eligible candidates resolve to one unique reviewer, below quorum 2 |
| Happy lifecycle finalize | `0x7bbe5efdaaf0d7e9939605eea779606d48345dddce99853dc3e3b4552d183970` | `READY` |
| Happy lifecycle activate | `0xb89a836a909bd7b83e5ab59c49fcd7db0357b507cc55ba85a3268b33ffe3da1c` | `ACTIVE`; two primary assignments |
| Happy lifecycle close | `0xe94ec050b15e5d778607433d041bf30ad2991b0490b9a06d58283ca846bb2684` | `CLOSED`; fingerprint `00dc58dbcf45af45288e0b9fcd704084ca46a51b7e267809e93d6ceba635b58c` |
| Duplicate nonce rejection | `0x875c13853f0cb27ea37af7ecdd8b72b6a51e80b73ec39b75c5feb34110d34b23` | Rejected; round state unchanged |
| Unauthorized write rejection | `0x1a0056272a9def67431e84feda180cb7211596a084fd16c04db20f73c3677bf4` | Rejected; round state unchanged |
| Deterministic backup promotion | `0xea5563ade59107e015da2f83291604871d181ecbce1c6443b9f76f8a0c509564` | Applicant 0 `BACKUP_ACTIVE` reviewer 1; applicant 1 `PRIMARY_ACTIVE` reviewer 0 |
| Assessment replay rejection | `0xb0e203ba7d5154c0ddc2e8bd2a13fc450308e0d6d1c9ae4726d48c3cabaa7a28` | Rejected; attempt and fingerprint unchanged |
| Applicant capacity boundary | `0xef146fa70cbf40e52a424e28f9231d3ceb576418a3a7efc6d9ed9f63c7a1f913` | Fifth applicant rejected; count remains 4 |

## Retained failed and non-mutating attempts

No attempted Studio case is omitted:

- Backup-promotion pair `(0, 0)` first attempt `0x49498e992c5cdba623ddc44bf6fe7b95e28c53a5815b806347c3000389d1b304` finalized `MAJORITY_DISAGREE`; leader execution succeeded but consensus did not authorize state mutation. Authoritative assessment readback remained absent.
- Its second attempt `0xa746718a3ab679fbd8722e99eb821a0624ec812bc79f63b588bfd64f7d33f18f` also finalized `MAJORITY_DISAGREE`; authoritative assessment readback again remained absent.
- The third attempt `0xce4191f660109f7d6c18430ec93bb148ac51ffd00345ebea3f57e6b6e91006ea` finalized `MAJORITY_AGREE`; authoritative readback became `CURRENT_INSTITUTIONAL_OVERLAP / RECUSED`, enabling the documented deterministic backup promotion.
- During the HOLD-round parallel screening call, Studio RPC returned an HTML error body (`Unexpected token '<'`) instead of JSON. Chain readback showed both assessments had been accepted; no blind automatic resubmission was made.
- The subsequent explicit duplicate probe `0xd9b6890b5385160997440d8bca32898a028c00e05e149d8f1230755d49ece408` finalized with leader `ERROR`. The existing pair remained attempt 1 with the same `NO_PUBLIC_CONFLICT_FOUND / ELIGIBLE` assessment, proving unchanged state.

## Upgrade rehearsal

Separate contract: `0xaD60Ce10E0BA00009DC363686bA9946C6a3C8DBf`

- Deployment `0x9792f0f489fb0eee763a4e496dcd905a718f8f10bb96fdbbf08a285a4f1c75a4`: exact source SHA, finalized consensus success.
- Pre-upgrade state creation `0xc232d2bf1d57ad96f86df29c037a96a3766eed3399d7614ca4c628be8edcd609`.
- Upgrade `0x900d17d32e703d36cafddd5a912af4fb170c372176ef707da2adf5007090ec6a`: finalized consensus success.
- Post-upgrade code SHA is unchanged and exact. Round nonce, title hash, `DRAFT` lifecycle, event count, and upgrader all match their pre-upgrade readbacks.

## Local verification

- Direct tests: 60 passed.
- Pinned-runtime tests: 1 passed.
- Ruff: passed.
- GenVM lint: 3 checks passed.
- Dependency check: no broken requirements.

The deployment is Studionet-only. Public ORCID, PubMed, and NIH availability can change; unavailable or unusable evidence fails closed instead of granting clearance.
