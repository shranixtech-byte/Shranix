import { Injectable, Logger } from '@nestjs/common';

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits: Map<string, CircuitState> = new Map();
  private readonly failureThreshold = 5;
  private readonly resetTimeoutMs = 30000;
  async call<T>(
    name: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
    timeoutMs = 30000,
    retries = 2,
  ): Promise<T> {
    const circuit = this.getCircuit(name);

    // Check if circuit is open
    if (circuit.state === 'open') {
      if (Date.now() - circuit.lastFailureTime > this.resetTimeoutMs) {
        circuit.state = 'half-open';
        this.logger.log(`Circuit "${name}" entering half-open state`);
      } else {
        this.logger.warn(`Circuit "${name}" is open, using fallback`);
        return fallback ? fallback() : this.getOfflineResponse(name);
      }
    }

    // Attempt the call with timeout and retries
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.withTimeout(fn(), timeoutMs);
        // Success - reset circuit
        if (circuit.state !== 'closed') {
          this.logger.log(`Circuit "${name}" recovered, closing`);
        }
        circuit.failures = 0;
        circuit.state = 'closed';
        return result;
      } catch (error) {
        circuit.failures++;
        circuit.lastFailureTime = Date.now();

        if (attempt < retries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
          this.logger.warn(`Attempt ${attempt + 1} failed for "${name}", retrying in ${backoff}ms: ${(error as Error).message}`);
          await this.sleep(backoff);
        } else {
          this.logger.error(`All ${retries + 1} attempts failed for "${name}": ${(error as Error).message}`);

          // Open circuit if threshold exceeded
          if (circuit.failures >= this.failureThreshold) {
            circuit.state = 'open';
            this.logger.warn(`Circuit "${name}" opened due to ${circuit.failures} failures`);
          }

          if (fallback) {
            return fallback();
          }
          throw error;
        }
      }
    }

    throw new Error(`Circuit "${name}" failed after all retries`);
  }

  getStatus(name: string): { state: string; failures: number } {
    const circuit = this.circuits.get(name);
    return circuit ? { state: circuit.state, failures: circuit.failures } : { state: 'closed', failures: 0 };
  }

  getAllStatuses(): Array<{ name: string; state: string; failures: number }> {
    return Array.from(this.circuits.entries()).map(([name, circuit]) => ({
      name,
      state: circuit.state,
      failures: circuit.failures,
    }));
  }

  private getCircuit(name: string): CircuitState {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, { failures: 0, lastFailureTime: 0, state: 'closed' });
    }
    return this.circuits.get(name)!;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);

    try {
      const result = await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(`Request timed out after ${ms}ms`));
          }, ms);
        }),
      ]);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getOfflineResponse(name: string): never {
    throw new Error(`AI provider "${name}" is currently unavailable. The circuit breaker is open. Please try again later.`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
