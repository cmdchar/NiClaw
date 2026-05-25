import { logger } from '../../utils/logger';

export interface TelemetryMetric {
  timestamp: number;
  type: 'token_usage' | 'latency' | 'success_rate' | 'cost';
  value: number;
  metadata?: Record<string, any>;
}

export class TelemetryEngine {
  private metrics: TelemetryMetric[] = [];

  logMetric(metric: TelemetryMetric) {
    this.metrics.push(metric);
    logger.debug(`[Telemetry] Recorded ${metric.type}: ${metric.value}`);

    // In a real AI OS, we would persist this to a local DB or file
    if (this.metrics.length > 1000) {
      this.metrics.shift(); // Keep buffer sane
    }
  }

  getMetrics(type?: string, durationMs: number = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    return this.metrics.filter(m =>
      (!type || m.type === type) &&
      (now - m.timestamp < durationMs)
    );
  }

  getSummary() {
    const last24h = this.getMetrics();
    return {
      totalTokens: last24h.filter(m => m.type === 'token_usage').reduce((acc, m) => acc + m.value, 0),
      avgLatency: last24h.filter(m => m.type === 'latency').reduce((acc, m, _, arr) => acc + m.value / arr.length, 0),
      totalCost: last24h.filter(m => m.type === 'cost').reduce((acc, m) => acc + m.value, 0),
      count: last24h.length
    };
  }
}

export const telemetryEngine = new TelemetryEngine();
