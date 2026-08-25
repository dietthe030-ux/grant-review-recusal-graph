// ============================================================================
// Grant Review Recusal Graph — RPC Coordinator Unit Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rpcCoordinator } from '@/services/rpcCoordinator';

describe('Shared RPC Coordinator', () => {
  beforeEach(() => {
    rpcCoordinator.invalidateCache();
    rpcCoordinator.resetMetrics();
    vi.restoreAllMocks();
  });

  it('serves repeated calls within 8s TTL from memory cache', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ jsonrpc: '2.0', id: 1, result: { value: 42 } }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const res1 = await rpcCoordinator.call<{ value: number }>('test_method', ['test']);
    expect(res1.value).toBe(42);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Immediate second call should hit cache
    const res2 = await rpcCoordinator.call<{ value: number }>('test_method', ['test']);
    expect(res2.value).toBe(42);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const metrics = rpcCoordinator.getMetrics();
    expect(metrics.totalCalls).toBe(1);
    expect(metrics.cacheHits).toBe(1);
  });

  it('coalesces concurrent identical in-flight RPC requests', async () => {
    let resolveFirst: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const mockFetch = vi.fn().mockImplementation(() =>
      pendingPromise.then(() => ({
        status: 200,
        text: async () => JSON.stringify({ jsonrpc: '2.0', id: 1, result: { count: 99 } }),
      }))
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    // Dispatch two calls concurrently before the first resolves
    const call1 = rpcCoordinator.call<{ count: number }>('slow_method', [1, 2], { bypassCache: true });
    const call2 = rpcCoordinator.call<{ count: number }>('slow_method', [1, 2], { bypassCache: true });

    // Now resolve the fetch
    resolveFirst!(null);

    const [res1, res2] = await Promise.all([call1, call2]);
    expect(res1.count).toBe(99);
    expect(res2.count).toBe(99);

    // Only 1 HTTP request should have been dispatched
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const metrics = rpcCoordinator.getMetrics();
    expect(metrics.coalescedCalls).toBe(1);
  });

  it('clears cache on invalidateCache()', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ jsonrpc: '2.0', id: 1, result: { count: 10 } }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await rpcCoordinator.call('test_method', [1]);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    rpcCoordinator.invalidateCache();

    await rpcCoordinator.call('test_method', [1]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles HTML error response safely (e.g. 502 Bad Gateway)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><body>502 Bad Gateway</body></html>',
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(rpcCoordinator.call('test_method', [])).rejects.toThrow(
      /RPC returned HTML error page/
    );
  });

  it('handles 429 rate limit and tracks cooldown metrics', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 429,
      text: async () => 'Too Many Requests',
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(rpcCoordinator.call('rate_test', [])).rejects.toThrow(/HTTP 429/);
    const metrics = rpcCoordinator.getMetrics();
    expect(metrics.failedCalls).toBe(1);
    expect(metrics.lastCooldownTimestamp).toBeGreaterThan(0);
  });
});
