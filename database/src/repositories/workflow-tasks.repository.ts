import { eq, and, isNull } from 'drizzle-orm';
import { MasterDataRepository } from './masters.repository';
import type { DatabaseClient } from '../client/index';
import { sqliteWorkflowTasks, pgWorkflowTasks } from '../schema/workflow';

export class WorkflowTasksRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWorkflowTasks, pgWorkflowTasks, db, isPostgres);
  }

  async markCompletedByInstance(instanceId: string, userId: string) {
    const now = new Date().toISOString();
    const table = this.isPostgres ? this.pgTable : this.sqliteTable;
    await (this.db as any)
      .update(table)
      .set({ status: 'completed', completedAt: now, completedBy: userId })
      .where(and(eq(table.instanceId, instanceId), eq(table.status, 'pending'), isNull(table.deletedAt)));
    return { message: `Tasks completed for instance ${instanceId}` };
  }
}
