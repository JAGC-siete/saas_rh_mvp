/**
 * Drain Odoo outbox inline. No BullMQ worker exists for `odoo-sync`;
 * Redis enqueue was write-only. Cron `/api/cron/odoo-sync` is the deterministic drain.
 */
export const addOdooSyncJob = (outboxId: string): void => {
  void import('../integrations/odoo/process-outbox')
    .then((mod) => mod.processOdooOutboxRow(outboxId))
    .catch((error: unknown) => {
      console.warn(
        `[odoo] Inline outbox drain failed for ${outboxId}:`,
        error instanceof Error ? error.message : String(error)
      )
    })
}
