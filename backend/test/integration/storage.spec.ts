import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../../src/storage/storage.service';
import * as fs from 'fs';
import * as path from 'path';

describe('StorageService (unit)', () => {
  let service: StorageService;
  const testDir = path.join(__dirname, '..', '..', 'test-storage');

  beforeAll(async () => {
    process.env.LOCAL_STORAGE_PATH = testDir;
    process.env.STORAGE_ADAPTER = 'local';

    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('local storage', () => {
    const testFile = 'test/hello.txt';
    const testContent = Buffer.from('Hello, World!');

    it('should save a file', async () => {
      const result = await service.save(testFile, testContent, 'text/plain');
      expect(result).toBeTruthy();
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should read a file', async () => {
      const content = await service.read(testFile);
      expect(content.toString()).toBe('Hello, World!');
    });

    it('should check file existence', async () => {
      const exists = await service.exists(testFile);
      expect(exists).toBe(true);

      const notExists = await service.exists('nonexistent.txt');
      expect(notExists).toBe(false);
    });

    it('should delete a file', async () => {
      const deleted = await service.delete(testFile);
      expect(deleted).toBe(true);
      expect(fs.existsSync(path.join(testDir, testFile))).toBe(false);
    });

    it('should return false when deleting nonexistent file', async () => {
      const deleted = await service.delete('nonexistent.txt');
      expect(deleted).toBe(false);
    });

    it('should return empty string for signed URL (local)', async () => {
      const url = await service.getSignedUrl('test.txt');
      expect(url).toBe('');
    });
  });
});
