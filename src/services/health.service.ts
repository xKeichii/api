import type { HealthStatus } from '../types/health.js';

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
