// ============================================================================
// Grant Review Recusal Graph — Shared RPC Coordinator
// ============================================================================

import {
  STUDIONET_RPC_URL,
  READ_CACHE_TTL_MS,
  COOLDOWN_429_BASE_MS,
  ZERO_ADDRESS,
} from '@/config/constants';
import { abi } from 'genlayer-js';

export interface RpcMetrics {
  totalCalls: number;
  cacheHits: number;
  coalescedCalls: number;
  throttledCalls: number;
  failedCalls: number;
  lastCooldownTimestamp: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function fromHex(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function toJsonSafeDeep(val: unknown, seen = new Set<unknown>()): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === 'bigint') {
    const maxSafe = 9007199254740991n;
    return val <= maxSafe && val >= -maxSafe ? Number(val) : val.toString();
  }
  if (val instanceof Uint8Array) {
    let hex = '0x';
    for (let i = 0; i < val.length; i++) {
      hex += val[i].toString(16).padStart(2, '0');
    }
    return hex;
  }
  if (typeof val === 'object') {
    if (seen.has(val)) return null;
    seen.add(val);

    if (Array.isArray(val)) {
      return val.map((item) => toJsonSafeDeep(item, seen));
    }
    if (val instanceof Map) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of val.entries()) {
        obj[String(k)] = toJsonSafeDeep(v, seen);
      }
      return obj;
    }
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      obj[k] = toJsonSafeDeep(v, seen);
    }
    return obj;
  }
  return val;
}

class RpcCoordinator {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private inFlightRequests: Map<string, Promise<unknown>> = new Map();
  private cooldownUntil: number = 0;
  private cooldownAttempts: number = 0;
  private metrics: RpcMetrics = {
    totalCalls: 0,
    cacheHits: 0,
    coalescedCalls: 0,
    throttledCalls: 0,
    failedCalls: 0,
    lastCooldownTimestamp: 0,
  };
  private isDocumentVisible: boolean = true;

  constructor() {
    if (typeof document !== 'undefined') {
      this.isDocumentVisible = document.visibilityState === 'visible';
      document.addEventListener('visibilitychange', () => {
        this.isDocumentVisible = document.visibilityState === 'visible';
      });
    }
  }

  /**
   * Clears entire read cache (called after successful write transactions).
   */
  public invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * Returns copy of RPC metrics.
   */
  public getMetrics(): RpcMetrics {
    return { ...this.metrics };
  }

  /**
   * Resets metrics counters.
   */
  public resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      cacheHits: 0,
      coalescedCalls: 0,
      throttledCalls: 0,
      failedCalls: 0,
      lastCooldownTimestamp: 0,
    };
  }

  /**
   * Executes an authentic GenLayer read-only contract call using gen_call and SDK calldata encoding.
   */
  public async readContract<T = unknown>(args: {
    address: string;
    functionName: string;
    args?: unknown[];
    kwargs?: Record<string, unknown>;
    options?: { bypassCache?: boolean; ttlMs?: number };
  }): Promise<T> {
    const { address, functionName, args: callArgs = [], kwargs, options = {} } = args;

    // 1. Encode GenLayer binary calldata
    const calldataObj = abi.calldata.makeCalldataObject(functionName, callArgs as never, kwargs as never);
    const encoded = abi.calldata.encode(calldataObj);
    const serializedData = abi.transactions.serialize([encoded as never, false]);

    const requestParams = {
      type: 'read',
      to: address,
      from: ZERO_ADDRESS,
      data: serializedData,
      transaction_hash_variant: 'latest-nonfinal',
    };

    // 2. Execute gen_call via coordinated RPC pipeline
    const rawHexResult = await this.call<string>('gen_call', [requestParams], options);

    // 3. Extract and decode binary response
    let hexData = rawHexResult;
    if (typeof rawHexResult === 'object' && rawHexResult !== null && 'data' in rawHexResult) {
      const obj = rawHexResult as { data: string; status?: { code: number; message?: string } };
      if (obj.status && obj.status.code !== 0) {
        throw new Error(`gen_call failed: ${obj.status.message || 'Unknown error'}`);
      }
      hexData = `0x${obj.data}`;
    }

    if (typeof hexData !== 'string') {
      throw new Error(`Unexpected gen_call response format: ${JSON.stringify(rawHexResult)}`);
    }

    const prefixedHex = hexData.startsWith('0x') ? hexData : `0x${hexData}`;
    const resultBinary = fromHex(prefixedHex);
    const decoded = abi.calldata.decode(resultBinary);

    return toJsonSafeDeep(decoded) as T;
  }

  /**
   * Executes a coordinated RPC call with request deduplication, caching, and rate-limit backoff.
   */
  public async call<T>(
    method: string,
    params: unknown[],
    options: { bypassCache?: boolean; ttlMs?: number } = {}
  ): Promise<T> {
    const cacheKey = `${method}:${JSON.stringify(params)}`;
    const now = Date.now();
    const ttl = options.ttlMs ?? READ_CACHE_TTL_MS;

    // 1. Check read cache unless explicitly bypassed
    if (!options.bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && now - cached.timestamp < ttl) {
        this.metrics.cacheHits++;
        return cached.data as T;
      }
    }

    // 2. Request Coalescing / Deduplication: If identical request is currently in-flight, reuse it
    const existingInFlight = this.inFlightRequests.get(cacheKey);
    if (existingInFlight) {
      this.metrics.coalescedCalls++;
      return existingInFlight as Promise<T>;
    }

    // 3. Initiate new in-flight execution
    const requestPromise = (async (): Promise<T> => {
      // Pause if document is hidden to conserve RPC budget
      while (!this.isDocumentVisible) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Check active rate-limit cooldown
      const currentNow = Date.now();
      if (currentNow < this.cooldownUntil) {
        this.metrics.throttledCalls++;
        const waitMs = this.cooldownUntil - currentNow;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      this.metrics.totalCalls++;

      try {
        const result = await this.rawFetch<T>(method, params);
        // Successful response - reset consecutive cooldown counter
        this.cooldownAttempts = 0;

        // Cache result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        return result;
      } catch (err: unknown) {
        this.metrics.failedCalls++;
        this.handleRpcError(err);
        throw err;
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  private async rawFetch<T>(method: string, params: unknown[]): Promise<T> {
    const payload = {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000) + 1,
      method,
      params,
    };

    let response: Response;
    try {
      response = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr: unknown) {
      throw new Error(
        `RPC Network failure connecting to Studionet (${STUDIONET_RPC_URL}): ${
          networkErr instanceof Error ? networkErr.message : 'Unknown network error'
        }`
      );
    }

    if (response.status === 429 || response.status >= 500) {
      throw new Error(`HTTP ${response.status}: RPC server rate limited or unavailable`);
    }

    const text = await response.text();

    // Guard against HTML error pages returned by proxy/server (e.g. Unexpected token '<')
    if (text.trim().startsWith('<')) {
      throw new Error(`RPC returned HTML error page instead of JSON-RPC: ${text.slice(0, 120)}...`);
    }

    let json: { result?: T; error?: { code: number; message: string; data?: unknown } };
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Malformed JSON response from RPC: ${text.slice(0, 100)}`);
    }

    if (json.error) {
      throw new Error(`RPC Error (${json.error.code}): ${json.error.message}`);
    }

    return json.result as T;
  }

  private handleRpcError(err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('429') ||
      msg.includes('rate limited') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503')
    ) {
      this.cooldownAttempts++;
      // Exponential backoff with jitter: base * 1.5^attempts + jitter
      const jitter = Math.floor(Math.random() * 1000);
      const backoff = Math.min(
        COOLDOWN_429_BASE_MS * Math.pow(1.5, this.cooldownAttempts - 1) + jitter,
        30000
      );
      this.cooldownUntil = Date.now() + backoff;
      this.metrics.lastCooldownTimestamp = Date.now();
    }
  }
}

export const rpcCoordinator = new RpcCoordinator();
