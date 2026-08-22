/**
 * H21 — Local Bounded Smoke Load Test
 *
 * IMPORTANT: This is a LOCAL / NON-PRODUCTION load test.
 * It runs against a local dev server and measures basic throughput/latency.
 * Real distributed load validation requires a staging environment.
 *
 * Run: npx tsx tests/load/smoke-load-test.ts
 * Requires: local backend server running on port 4001
 */

const BASE_URL = process.env.API_URL || 'http://localhost:4001/v1';
const CONCURRENCY = parseInt(process.env.LOAD_CONCURRENCY || '5');
const REQUESTS_PER_ENDPOINT = parseInt(process.env.LOAD_REQUESTS || '20');

interface LoadResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  requestsPerSecond: number;
}

async function measureEndpoint(
  method: string,
  path: string,
  body?: object,
  headers?: Record<string, string>,
): Promise<LoadResult> {
  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  const runBatch = async () => {
    const promises = Array.from({ length: REQUESTS_PER_ENDPOINT }, async () => {
      const reqStart = Date.now();
      try {
        const res = await fetch(`${BASE_URL}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        const latency = Date.now() - reqStart;
        latencies.push(latency);
        if (res.status >= 200 && res.status < 500) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        const latency = Date.now() - reqStart;
        latencies.push(latency);
        errorCount++;
      }
    });
    await Promise.all(promises);
  };

  // Run batches sequentially for controlled concurrency
  for (let i = 0; i < Math.ceil(CONCURRENCY); i++) {
    await runBatch();
  }

  const totalTimeMs = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const percentile = (p: number) => {
    const idx = Math.ceil((p / 100) * latencies.length) - 1;
    return latencies[Math.max(0, idx)] || 0;
  };

  return {
    endpoint: path,
    method,
    totalRequests: successCount + errorCount,
    successCount,
    errorCount,
    avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) || 0,
    p50LatencyMs: percentile(50),
    p95LatencyMs: percentile(95),
    p99LatencyMs: percentile(99),
    maxLatencyMs: latencies[latencies.length - 1] || 0,
    requestsPerSecond: Math.round(((successCount + errorCount) / totalTimeMs) * 1000) || 0,
  };
}

function printResult(r: LoadResult) {
  const status = r.errorCount === 0 ? '✅' : r.errorCount < r.totalRequests * 0.1 ? '⚠️' : '❌';
  console.log(`${status} ${r.method} ${r.endpoint}`);
  console.log(
    `   Requests: ${r.totalRequests} | Success: ${r.successCount} | Errors: ${r.errorCount}`,
  );
  console.log(
    `   Latency: avg=${r.avgLatencyMs}ms p50=${r.p50LatencyMs}ms p95=${r.p95LatencyMs}ms p99=${r.p99LatencyMs}ms max=${r.maxLatencyMs}ms`,
  );
  console.log(`   Throughput: ${r.requestsPerSecond} req/s`);
  console.log('');
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log(' H21 Local Smoke Load Test');
  console.log(' Label: LOCAL / NON-PRODUCTION');
  console.log(` Target: ${BASE_URL}`);
  console.log(` Concurrency: ${CONCURRENCY} | Requests/endpoint: ${REQUESTS_PER_ENDPOINT}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Check if server is reachable
  try {
    const healthRes = await fetch(`${BASE_URL.replace('/v1', '')}/v1/health/live`);
    if (!healthRes.ok) {
      console.log('⚠️  Server not reachable at', BASE_URL);
      console.log('   Start the backend server first: pnpm dev');
      console.log('   Skipping load test — documenting as EXTERNAL DEPENDENCY');
      process.exit(0);
    }
    console.log('✓ Server is reachable');
    console.log('');
  } catch {
    console.log('⚠️  Server not reachable at', BASE_URL);
    console.log('   Start the backend server first: pnpm dev');
    console.log('   Skipping load test — documenting as EXTERNAL DEPENDENCY');
    process.exit(0);
  }

  const results: LoadResult[] = [];

  // Scenario A: Health/readiness endpoints (unauthenticated)
  console.log('── Scenario A: Health Endpoints ──');
  results.push(await measureEndpoint('GET', '/health/live'));
  results.push(await measureEndpoint('GET', '/health/ready'));
  results.push(await measureEndpoint('GET', '/health/status'));

  // Scenario B: Auth endpoints (unauthenticated, expected 401)
  console.log('── Scenario B: Auth Endpoints ──');
  results.push(
    await measureEndpoint('POST', '/auth/login', {
      email: 'nonexistent@test.com',
      password: 'wrongpassword',
    }),
  );

  // Scenario C: Protected endpoints (unauthenticated, expected 401)
  console.log('── Scenario C: Protected Endpoints (unauthenticated) ──');
  results.push(await measureEndpoint('GET', '/products'));
  results.push(await measureEndpoint('GET', '/customers'));
  results.push(await measureEndpoint('GET', '/suppliers'));
  results.push(await measureEndpoint('GET', '/dashboard'));

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log(' Summary');
  console.log('═══════════════════════════════════════════════════');

  const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const avgLatency = Math.round(
    results.reduce((sum, r) => sum + r.avgLatencyMs, 0) / results.length,
  );

  console.log(`Total requests: ${totalRequests}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Average latency: ${avgLatency}ms`);
  console.log(`Endpoints tested: ${results.length}`);
  console.log('');
  console.log('NOTE: This is a LOCAL smoke test, not production load validation.');
  console.log('Real distributed load testing requires a staging environment.');
  console.log('═══════════════════════════════════════════════════');

  results.forEach(printResult);
}

main().catch(console.error);
