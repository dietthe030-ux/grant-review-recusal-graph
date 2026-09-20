# Recovery

The submitted contract is `UPGRADABLE`. Its recorded Studio Next upgrader is
`0x8581c4a532dd3f9b163b12809b1bd089f367147f`. No secret is stored in this repository.

- If Studio local data is reset but Studio Next state remains, reconnect the recorded upgrader, import
  `0x76cdD2006178858b1c48254B1d09a78c509bC4E7`, load the exact source identified by the deployment manifest, verify its SHA-256, and use the public `upgrade(bytes)` path only after review.
- If the recorded upgrader becomes unavailable, the old contract remains readable but cannot be safely upgraded. Deploy a replacement from the recorded source and constructor, rerun the live matrix, then update all frontend and evidence references.
- If Studio Next state resets, redeploy from the recorded source commit and constructor, rerun the live matrix, and replace the address everywhere. The old address is not recoverable across a network reset.

Safe-upgrade rehearsal was performed on the separate deployment recorded in
`deployments/studionet.json`. The rehearsal preserved nonce, title hash, lifecycle, event count, and upgrader while retaining the exact source hash.
