/** Pure monitoring config helpers (safe to import from Node check scripts). */

export function resolveMonitoringEnabled(dsn: string | undefined | null): boolean {
  return (dsn ?? '').trim().length > 0;
}
