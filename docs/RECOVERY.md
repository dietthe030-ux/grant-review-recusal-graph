# Recovery

The submitted contract is `UPGRADABLE`. Its recorded Studionet upgrader is
`0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`. No secret is stored in this repository.

- If Studio local data is reset but Studionet state remains, reconnect the recorded upgrader, import
  `0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8`, load the exact source identified by the deployment manifest, verify its SHA-256, and use the public `upgrade(bytes)` path only after review.
- If the recorded upgrader becomes unavailable, the old contract remains readable but cannot be safely upgraded. Deploy a replacement from the recorded source and constructor, rerun the live matrix, then update all frontend and evidence references.
- If Studionet state resets, redeploy from the recorded source commit and constructor, rerun the live matrix, and replace the address everywhere. The old address is not recoverable across a network reset.

Safe-upgrade rehearsal was performed on the separate deployment recorded in
`deployments/studionet.json`. The rehearsal preserved nonce, title hash, lifecycle, event count, and upgrader while retaining the exact source hash.
