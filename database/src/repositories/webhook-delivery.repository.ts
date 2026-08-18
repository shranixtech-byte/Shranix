import type { DatabaseClient } from '../client/index';
import type { DatabaseConfig } from '../config/index';
import { loadDatabaseConfig } from '../config/index';

/**
 * WebhookDeliveriesRepository — read/write webhook delivery history.
 *
 * Delivery records are append-only observability data. Writes are best-effort
 * (failures don't block the webhook trigger). Reads support the delivery
 * history UI.
 */
export class WebhookDeliveriesRepository {
  private readonly config: DatabaseConfig;

  constructor(_db: DatabaseClient, _isPostgres: boolean) {
    this.config = loadDatabaseConfig();
  }

  private get rawClient(): any {
    if (this.config.provider === 'postgresql') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPostgresClient } = require('../client/postgres.client');
      return getPostgresClient();
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRawSqliteClient } = require('../client/sqlite.client');
    return getRawSqliteClient();
  }

  private get isPostgres(): boolean {
    return this.config.provider === 'postgresql';
  }

  /**
   * Create a delivery history record.
   */
  async create(data: {
    id: string;
    webhookId: string;
    attempt: number;
    status: string;
    triggeredAt: string;
    eventType?: string;
    payloadRef?: string;
  }): Promise<void> {
    if (this.isPostgres) {
      const sql = this.rawClient;
      await sql.unsafe(
        `INSERT INTO shranix_webhook_deliveries (id, webhook_id, attempt, status, event_type, payload_ref, triggered_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          data.id,
          data.webhookId,
          data.attempt,
          data.status,
          data.eventType || null,
          data.payloadRef || null,
          data.triggeredAt,
        ],
      );
      return;
    }

    const client = this.rawClient;
    await client.execute({
      sql: `INSERT INTO shranix_webhook_deliveries (id, webhook_id, attempt, status, event_type, payload_ref, triggered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.id,
        data.webhookId,
        data.attempt,
        data.status,
        data.eventType || null,
        data.payloadRef || null,
        data.triggeredAt,
      ],
    });
  }

  /**
   * Update a delivery history record.
   */
  async update(id: string, data: Record<string, unknown>): Promise<void> {
    const setClauses: string[] = [];
    const args: unknown[] = [];

    if (data.status !== undefined) {
      setClauses.push('status = ?');
      args.push(data.status);
    }
    if (data.httpStatus !== undefined) {
      setClauses.push('http_status = ?');
      args.push(data.httpStatus);
    }
    if (data.error !== undefined) {
      setClauses.push('error = ?');
      args.push(data.error);
    }
    if (data.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      args.push(data.completedAt);
    }
    if (data.providerReference !== undefined) {
      setClauses.push('provider_reference = ?');
      args.push(data.providerReference);
    }

    if (setClauses.length === 0) {
      return;
    }

    args.push(id);

    if (this.isPostgres) {
      const sql = this.rawClient;
      const pgSetClauses = setClauses.map((c, i) => c.replace('?', `$${i + 1}`));
      await sql.unsafe(
        `UPDATE shranix_webhook_deliveries SET ${pgSetClauses.join(', ')} WHERE id = $${setClauses.length + 1}`,
        args,
      );
      return;
    }

    const client = this.rawClient;
    await client.execute({
      sql: `UPDATE shranix_webhook_deliveries SET ${setClauses.join(', ')} WHERE id = ?`,
      args,
    });
  }

  /**
   * Find all deliveries for a webhook (paginated).
   */
  async findAll(params: {
    webhookId: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number }> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    if (this.isPostgres) {
      const sql = this.rawClient;
      const countResult = await sql.unsafe(
        `SELECT COUNT(*) as cnt FROM shranix_webhook_deliveries WHERE webhook_id = $1`,
        [params.webhookId],
      );
      const total = Number(countResult?.[0]?.cnt || 0);

      const rows = await sql.unsafe(
        `SELECT * FROM shranix_webhook_deliveries WHERE webhook_id = $1 ORDER BY triggered_at DESC LIMIT $2 OFFSET $3`,
        [params.webhookId, pageSize, offset],
      );
      return { data: rows as any[], total };
    }

    const client = this.rawClient;
    const countResult = await client.execute({
      sql: `SELECT COUNT(*) as cnt FROM shranix_webhook_deliveries WHERE webhook_id = ?`,
      args: [params.webhookId],
    });
    const total = Number(countResult.rows?.[0]?.cnt || 0);

    const result = await client.execute({
      sql: `SELECT * FROM shranix_webhook_deliveries WHERE webhook_id = ? ORDER BY triggered_at DESC LIMIT ? OFFSET ?`,
      args: [params.webhookId, pageSize, offset],
    });
    return { data: result.rows || [], total };
  }

  /**
   * H7 — Find the most recent delivery with a payload_ref for a webhook.
   * Used by processRetries() to reconstruct the original event for retry.
   */
  async findLatestPayload(
    webhookId: string,
  ): Promise<{ eventType: string | null; payloadRef: string | null } | null> {
    if (this.isPostgres) {
      const sql = this.rawClient;
      const rows = await sql.unsafe(
        `SELECT event_type, payload_ref FROM shranix_webhook_deliveries
         WHERE webhook_id = $1 AND payload_ref IS NOT NULL
         ORDER BY triggered_at DESC LIMIT 1`,
        [webhookId],
      );
      const row = (rows as any[])[0];
      return row ? { eventType: row.event_type, payloadRef: row.payload_ref } : null;
    }

    const client = this.rawClient;
    const result = await client.execute({
      sql: `SELECT event_type, payload_ref FROM shranix_webhook_deliveries
            WHERE webhook_id = ? AND payload_ref IS NOT NULL
            ORDER BY triggered_at DESC LIMIT 1`,
      args: [webhookId],
    });
    const row = result.rows?.[0];
    return row ? { eventType: row.event_type, payloadRef: row.payload_ref } : null;
  }

  /**
   * H7 — Delete delivery records older than the given number of days.
   * Returns the number of records deleted.
   */
  async cleanupOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

    if (this.isPostgres) {
      const sql = this.rawClient;
      const result = await sql.unsafe(
        `DELETE FROM shranix_webhook_deliveries WHERE triggered_at < $1`,
        [cutoff],
      );
      return (result as any).count || 0;
    }

    const client = this.rawClient;
    const result = await client.execute({
      sql: `DELETE FROM shranix_webhook_deliveries WHERE triggered_at < ?`,
      args: [cutoff],
    });
    return (result as any).rowsAffected || 0;
  }
}
