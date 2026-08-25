// ============================================================================
// Grant Review Recusal Graph — Validation Utilities
// ============================================================================

import {
  MIN_QUORUM,
  MAX_QUORUM,
  MAX_BACKUP_REVIEWERS,
} from '@/config/constants';

export interface ValidationResult<T = void> {
  isValid: boolean;
  error?: string;
  value?: T;
}

/**
 * Validates canonical ORCID identifier with ISO 7064 Mod 11,2 checksum.
 * Format: 0000-0000-0000-000[0-9X]
 */
export function validateOrcid(orcidInput: string): ValidationResult<string> {
  if (!orcidInput || typeof orcidInput !== 'string') {
    return { isValid: false, error: 'ORCID is required' };
  }

  const trimmed = orcidInput.trim();
  const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

  if (!orcidRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'ORCID format must be 0000-0000-0000-000[0-9X] (e.g. 0000-0002-1825-0097)',
    };
  }

  // Extract pure digits and check digit
  const digits = trimmed.replace(/-/g, '');
  if (digits.length !== 16) {
    return { isValid: false, error: 'ORCID must contain exactly 16 characters' };
  }

  let total = 0;
  for (let i = 0; i < 15; i++) {
    const digit = parseInt(digits[i], 10);
    total = (total + digit) * 2;
  }

  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const expectedCheckDigit = result === 10 ? 'X' : result.toString();
  const actualCheckDigit = digits[15].toUpperCase();

  if (actualCheckDigit !== expectedCheckDigit) {
    return {
      isValid: false,
      error: `Invalid ISO 7064 Mod 11,2 checksum (expected ${expectedCheckDigit}, got ${actualCheckDigit})`,
    };
  }

  return { isValid: true, value: trimmed };
}

/**
 * Validates 0x-prefixed 40-character hexadecimal Ethereum address.
 */
export function validateAddress(addressInput: string): ValidationResult<string> {
  if (!addressInput || typeof addressInput !== 'string') {
    return { isValid: false, error: 'Address is required' };
  }

  const trimmed = addressInput.trim().toLowerCase();
  const addressRegex = /^0x[0-9a-f]{40}$/;

  if (!addressRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Address must be a 42-character 0x-prefixed hex string (e.g. 0x1EAE...31C8)',
    };
  }

  return { isValid: true, value: trimmed };
}

/**
 * Validates quorum value within contract boundaries (2 to 4).
 */
export function validateQuorum(quorum: number): ValidationResult<number> {
  if (typeof quorum !== 'number' || isNaN(quorum) || !Number.isInteger(quorum)) {
    return { isValid: false, error: 'Quorum must be an integer' };
  }

  if (quorum < MIN_QUORUM || quorum > MAX_QUORUM) {
    return {
      isValid: false,
      error: `Quorum must be between ${MIN_QUORUM} and ${MAX_QUORUM} (inclusive)`,
    };
  }

  return { isValid: true, value: quorum };
}

/**
 * Validates round freeze and acknowledgement deadlines.
 */
export function validateDeadlines(
  freezeDeadline: number,
  acknowledgeDeadline: number,
  currentTimestamp: number = Math.floor(Date.now() / 1000)
): ValidationResult<{ freezeDeadline: number; acknowledgeDeadline: number }> {
  if (freezeDeadline <= currentTimestamp) {
    return {
      isValid: false,
      error: 'Freeze deadline must be in the future',
    };
  }

  if (acknowledgeDeadline < freezeDeadline) {
    return {
      isValid: false,
      error: 'Acknowledgement deadline must be greater than or equal to freeze deadline',
    };
  }

  return {
    isValid: true,
    value: { freezeDeadline, acknowledgeDeadline },
  };
}

/**
 * Validates comma-separated backup indexes for reviewer assignment.
 */
export function validateBackupCsv(
  csvInput: string,
  primaryIndex: number,
  maxReviewerIndex: number
): ValidationResult<number[]> {
  if (typeof csvInput !== 'string') {
    return { isValid: false, error: 'Backup indexes must be a CSV string' };
  }

  const trimmed = csvInput.trim();
  if (trimmed === '') {
    return { isValid: true, value: [] };
  }

  const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length > MAX_BACKUP_REVIEWERS) {
    return {
      isValid: false,
      error: `Maximum of ${MAX_BACKUP_REVIEWERS} backup reviewers allowed per assignment`,
    };
  }

  const parsedIndexes: number[] = [];
  const seen = new Set<number>();

  for (const part of parts) {
    const idx = parseInt(part, 10);
    if (isNaN(idx) || idx < 0 || idx > maxReviewerIndex) {
      return {
        isValid: false,
        error: `Backup reviewer index ${part} is out of bounds (0 to ${maxReviewerIndex})`,
      };
    }

    if (idx === primaryIndex) {
      return {
        isValid: false,
        error: `Backup reviewer index ${idx} cannot be the same as primary reviewer index ${primaryIndex}`,
      };
    }

    if (seen.has(idx)) {
      return {
        isValid: false,
        error: `Duplicate backup reviewer index ${idx} in CSV`,
      };
    }

    seen.add(idx);
    parsedIndexes.push(idx);
  }

  return { isValid: true, value: parsedIndexes };
}

/**
 * Validates client nonce string for idempotent round creation.
 */
export function validateClientNonce(nonce: string): ValidationResult<string> {
  if (!nonce || typeof nonce !== 'string') {
    return { isValid: false, error: 'Client nonce is required' };
  }

  const trimmed = nonce.trim();
  if (trimmed.length < 1 || trimmed.length > 64) {
    return {
      isValid: false,
      error: 'Client nonce length must be between 1 and 64 characters',
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Client nonce must contain only alphanumeric characters, underscores, and hyphens',
    };
  }

  return { isValid: true, value: trimmed };
}
