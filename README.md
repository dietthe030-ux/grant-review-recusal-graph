# Grant Review Recusal Graph

Grant Review Recusal Graph is a GenLayer-native workbench for screening grant-review assignments against ambiguous public evidence. Its Intelligent Contract compares ORCID identity and employment records, PubMed co-authorship, and NIH RePORTER participation, then reaches validator consensus on recusal, eligibility, manual review, or an evidence hold.

The React frontend exposes the resulting applicant-reviewer graph, conflict matrix, source-level evidence, deterministic backup promotion, lifecycle controls, and append-only audit events. Public reads require no wallet. Writes use an explicitly selected EIP-6963 provider (MetaMask, OKX Wallet, or Rabby) on GenLayer Studionet.

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

## Trust boundary

Declared institutions are untrusted supporting metadata. Clearance is never inferred from missing, malformed, oversized, or unavailable public evidence; those conditions fail closed to an evidence hold. The project does not evaluate private disclosures, familial relationships, or final funding decisions.
