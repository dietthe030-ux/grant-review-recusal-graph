// ============================================================================
// Grant Review Recusal Graph — Validator Unit Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  validateOrcid,
  validateAddress,
  validateQuorum,
  validateDeadlines,
  validateBackupCsv,
  validateClientNonce,
} from '@/utils/validators';

describe('ISO 7064 Mod 11,2 ORCID Validator', () => {
  it('accepts canonical ORCID identifiers with valid checksums', () => {
    // Verified valid test vectors from live Studionet verification
    expect(validateOrcid('0000-0001-5109-3700').isValid).toBe(true);
    expect(validateOrcid('0000-0002-1825-0097').isValid).toBe(true);
    expect(validateOrcid('0000-0002-1694-233X').isValid).toBe(true);
    expect(validateOrcid('0000-0002-1825-0011').isValid).toBe(true);
  });

  it('rejects ORCID identifiers with invalid check digits', () => {
    expect(validateOrcid('0000-0001-5109-3701').isValid).toBe(false);
    expect(validateOrcid('0000-0002-1825-0098').isValid).toBe(false);
    expect(validateOrcid('0000-0002-1694-2330').isValid).toBe(false);
  });

  it('rejects malformed ORCID strings and empty input', () => {
    expect(validateOrcid('').isValid).toBe(false);
    expect(validateOrcid('invalid-orcid').isValid).toBe(false);
    expect(validateOrcid('0000-0001-5109-370').isValid).toBe(false);
    expect(validateOrcid('0000000151093700').isValid).toBe(false);
  });
});

describe('Ethereum 0x Address Validator', () => {
  it('accepts valid 42-character 0x-prefixed hexadecimal addresses', () => {
    expect(
      validateAddress('0x1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8').isValid
    ).toBe(true);
    expect(
      validateAddress('0x2000000000000000000000000000000000002000').isValid
    ).toBe(true);
    expect(
      validateAddress('0x34b92E6553eaCA11A00A9d86d75d8a7881779D78').isValid
    ).toBe(true);
  });

  it('rejects non-hex, short, or missing 0x prefix', () => {
    expect(validateAddress('').isValid).toBe(false);
    expect(validateAddress('0x123').isValid).toBe(false);
    expect(validateAddress('1EAE8A65b33d4277cE0Aa966e7CA9088b18531C8').isValid).toBe(false);
    expect(
      validateAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ').isValid
    ).toBe(false);
  });
});

describe('Quorum Bounds Validator', () => {
  it('accepts quorum between 2 and 4 inclusive', () => {
    expect(validateQuorum(2).isValid).toBe(true);
    expect(validateQuorum(3).isValid).toBe(true);
    expect(validateQuorum(4).isValid).toBe(true);
  });

  it('rejects quorum below 2 or above 4', () => {
    expect(validateQuorum(1).isValid).toBe(false);
    expect(validateQuorum(5).isValid).toBe(false);
    expect(validateQuorum(0).isValid).toBe(false);
    expect(validateQuorum(NaN).isValid).toBe(false);
  });
});

describe('Backup CSV Validator', () => {
  it('accepts valid comma-separated backup indexes', () => {
    const res1 = validateBackupCsv('2, 3', 0, 4);
    expect(res1.isValid).toBe(true);
    expect(res1.value).toEqual([2, 3]);

    const res2 = validateBackupCsv('', 0, 4);
    expect(res2.isValid).toBe(true);
    expect(res2.value).toEqual([]);
  });

  it('rejects primary reviewer duplicate in backups', () => {
    const res = validateBackupCsv('0, 2', 0, 4);
    expect(res.isValid).toBe(false);
  });

  it('rejects out of bounds or duplicate backup indexes', () => {
    expect(validateBackupCsv('5', 0, 4).isValid).toBe(false);
    expect(validateBackupCsv('2, 2', 0, 4).isValid).toBe(false);
    expect(validateBackupCsv('1, 2, 3, 4', 0, 5).isValid).toBe(false); // exceeds max 3
  });
});

describe('Deadlines and Nonce Validators', () => {
  it('validates freeze and ack deadlines correctly', () => {
    const now = 1000;
    expect(validateDeadlines(2000, 3000, now).isValid).toBe(true);
    expect(validateDeadlines(2000, 2000, now).isValid).toBe(true);
    expect(validateDeadlines(500, 3000, now).isValid).toBe(false); // past freeze
    expect(validateDeadlines(3000, 2000, now).isValid).toBe(false); // ack before freeze
  });

  it('validates alphanumeric client nonces', () => {
    expect(validateClientNonce('round_001').isValid).toBe(true);
    expect(validateClientNonce('client-nonce-123').isValid).toBe(true);
    expect(validateClientNonce('').isValid).toBe(false);
    expect(validateClientNonce('invalid nonce with spaces!').isValid).toBe(false);
  });
});
