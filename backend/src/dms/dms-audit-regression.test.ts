import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { DigitalSignatureService } from './services/digital-signature.service';
import { DmsService } from './services/dms.service';
import { SearchEngineService } from './services/search-engine.service';

/**
 * DMS Module Audit Regression Tests (real DB)
 *
 * Bug 1-6: filter vs filters pattern (version history, access logs, entity docs, signatures, OCR)
 * Bug 7: getVersionHistory returns all versions when document filter is ignored
 * Bug 8: restoreVersion doesn't verify version belongs to document
 * Bug 9: searchDocuments loads all docs into memory
 */
describe('DMS Audit Regression Tests (real DB)', () => {
  let dbDir: string;
  let database: DatabaseService;
  let dms: DmsService;
  let signatures: DigitalSignatureService;
  let search: SearchEngineService;

  let userId1: string;

  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'dms-audit-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    const audit = new AuditService(database, {
      getIp: () => null,
      getUserAgent: () => null,
    } as any);

    dms = new DmsService(database, audit);
    signatures = new DigitalSignatureService(database, audit);
    search = new SearchEngineService(database);

    // Seed a user
    const user = await database.users.create({
      email: 'dms-test@test.com',
      firstName: 'DMS',
      lastName: 'Test',
      passwordHash: 'x',
      isActive: true,
      refreshTokenVersion: 0,
    } as any);
    userId1 = (user as any).id;
  });

  afterAll(async () => {
    try {
      await (database as any).close?.();
    } catch {
      /* ignore */
    }
  });

  // ═══════════════════════════════════════════════════════
  // Bug 1-6: filter vs filters pattern
  // ═══════════════════════════════════════════════════════
  describe('Bug 1-6: filter vs filters pattern', () => {
    it('getDocumentsForEntity returns only linked documents', async () => {
      // Create two docs linked to different entities
      await dms.createDocument(
        {
          name: 'Invoice for Entity A',
          linkedModule: 'sales',
          linkedEntityId: 'entity-a-001',
          linkedEntityNumber: 'INV-001',
        },
        userId1,
      );
      await dms.createDocument(
        {
          name: 'Invoice for Entity B',
          linkedModule: 'sales',
          linkedEntityId: 'entity-b-002',
          linkedEntityNumber: 'INV-002',
        },
        userId1,
      );

      const docsA = await dms.getDocumentsForEntity('sales', 'entity-a-001');
      const dataA = (docsA as any).data || [];
      expect(dataA.length).toBe(1);
      expect((dataA[0] as any).linkedEntityId).toBe('entity-a-001');

      const docsB = await dms.getDocumentsForEntity('sales', 'entity-b-002');
      const dataB = (docsB as any).data || [];
      expect(dataB.length).toBe(1);
      expect((dataB[0] as any).linkedEntityId).toBe('entity-b-002');
    }, 30000);

    it('getVersionHistory returns only versions for specific document', async () => {
      const doc1 = await dms.createDocument({ name: 'Versioned Doc' }, userId1);
      const doc2 = await dms.createDocument({ name: 'Other Doc' }, userId1);

      // Create versions for doc1
      await dms.createVersion((doc1 as any).id, { changeNotes: 'v1 of doc1' }, userId1);
      await dms.createVersion((doc1 as any).id, { changeNotes: 'v2 of doc1' }, userId1);

      // Create version for doc2
      await dms.createVersion((doc2 as any).id, { changeNotes: 'v1 of doc2' }, userId1);

      // Version history for doc1 should only have 2 versions
      const v1History = await dms.getVersionHistory((doc1 as any).id);
      const v1Data = (v1History as any).data || [];
      expect(v1Data.length).toBe(2);

      // Version history for doc2 should only have 1 version
      const v2History = await dms.getVersionHistory((doc2 as any).id);
      const v2Data = (v2History as any).data || [];
      expect(v2Data.length).toBe(1);
    }, 30000);

    it('getAccessLogs returns only logs for specific document', async () => {
      const doc = await dms.createDocument({ name: 'Logged Doc' }, userId1);
      const otherDoc = await dms.createDocument({ name: 'Other Logged Doc' }, userId1);

      await dms.logAccess((doc as any).id, userId1, 'view');
      await dms.logAccess((doc as any).id, userId1, 'download');
      await dms.logAccess((otherDoc as any).id, userId1, 'view');

      const logs = await dms.getAccessLogs((doc as any).id);
      const logData = (logs as any).data || [];
      expect(logData.length).toBe(2);

      const otherLogs = await dms.getAccessLogs((otherDoc as any).id);
      const otherData = (otherLogs as any).data || [];
      expect(otherData.length).toBe(1);
    }, 30000);

    it('getDocumentSignatures returns only signatures for specific document', async () => {
      const doc1 = await dms.createDocument({ name: 'Signed Doc' }, userId1);
      const doc2 = await dms.createDocument({ name: 'Other Signed Doc' }, userId1);

      await signatures.signDocument((doc1 as any).id, userId1, {});
      await signatures.signDocument((doc2 as any).id, userId1, {});

      const sigs1 = await signatures.getDocumentSignatures((doc1 as any).id);
      const sigData1 = (sigs1 as any).data || [];
      expect(sigData1.length).toBe(1);

      const sigs2 = await signatures.getDocumentSignatures((doc2 as any).id);
      const sigData2 = (sigs2 as any).data || [];
      expect(sigData2.length).toBe(1);
    }, 30000);
  });

  // ═══════════════════════════════════════════════════════
  // Bug 8: restoreVersion cross-document prevention
  // ═══════════════════════════════════════════════════════
  describe('Bug 8: restoreVersion cross-document prevention', () => {
    it('returns null when restoring version from wrong document', async () => {
      const doc1 = await dms.createDocument({ name: 'Doc A' }, userId1);
      const doc2 = await dms.createDocument({ name: 'Doc B' }, userId1);

      const v1 = await dms.createVersion((doc2 as any).id, { changeNotes: 'v1 of B' }, userId1);

      // Try to restore doc2's version into doc1 — should return null
      const result = await dms.restoreVersion((doc1 as any).id, (v1 as any).id, userId1);
      expect(result).toBeNull();
    }, 30000);

    it('successfully restores version from same document', async () => {
      const doc = await dms.createDocument({ name: 'Restoreable Doc' }, userId1);
      const v1 = await dms.createVersion(
        (doc as any).id,
        {
          changeNotes: 'original version',
        },
        userId1,
      );

      const result = await dms.restoreVersion((doc as any).id, (v1 as any).id, userId1);
      expect(result).not.toBeNull();
      expect((result as any).changeNotes).toContain('Restored from version');
    }, 30000);
  });

  // ═══════════════════════════════════════════════════════
  // Bug 9: Search uses filters array
  // ═══════════════════════════════════════════════════════
  describe('Bug 9: Search uses filters array', () => {
    it('search filters by linkedModule', async () => {
      const modA = `modA-${randomUUID().slice(0, 8)}`;
      const modB = `modB-${randomUUID().slice(0, 8)}`;
      const nameA = `FilterTestA-${randomUUID().slice(0, 8)}`;
      const nameB = `FilterTestB-${randomUUID().slice(0, 8)}`;
      await dms.createDocument({ name: nameA, linkedModule: modA }, userId1);
      await dms.createDocument({ name: nameB, linkedModule: modB }, userId1);

      // Search with no query — filter by linkedModule only
      const results = await search.searchDocuments('', {
        linkedModule: modA,
      });
      const data = (results as any).data || [];
      // All returned docs should have the correct module
      for (const d of data) {
        expect((d as any).linkedModule).toBe(modA);
      }
    }, 30000);
  });
});
