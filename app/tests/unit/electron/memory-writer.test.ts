import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { memoryWriterService } from '../../../electron/services/memory-writer';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('MemoryWriterService', () => {
  let vaultRoot: string;

  beforeEach(async () => {
    vaultRoot = await mkdtemp(join(tmpdir(), 'niclaw-test-vault-'));
  });

  afterEach(async () => {
    try {
      await rm(vaultRoot, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('writes a valid relative .md path successfully', async () => {
    await memoryWriterService.safeWriteMemory(vaultRoot, 'test.md', '# Hello');
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(join(vaultRoot, 'test.md'), 'utf8');
    expect(content).toBe('# Hello');
  });

  it('rejects ../ traversal attempts', async () => {
    await expect(
      memoryWriterService.safeWriteMemory(vaultRoot, '../outside.md', '# Outside')
    ).rejects.toThrow('Directory traversal is not allowed');
  });

  it('rejects absolute paths from client', async () => {
    const absolutePath = process.platform === 'win32' ? 'C:\\temp\\test.md' : '/tmp/test.md';
    await expect(
      memoryWriterService.safeWriteMemory(vaultRoot, absolutePath, '# Absolute')
    ).rejects.toThrow('affectedFile must be a relative path');
  });

  it('rejects non-.md extension', async () => {
    await expect(
      memoryWriterService.safeWriteMemory(vaultRoot, 'test.txt', '# Text')
    ).rejects.toThrow('Only .md files are allowed');
  });

  it('appends with a marker if target exists', async () => {
    const target = join(vaultRoot, 'existing.md');
    await writeFile(target, '# Original', 'utf8');

    await memoryWriterService.safeWriteMemory(vaultRoot, 'existing.md', 'New Update');

    const { readFile } = await import('node:fs/promises');
    const content = await readFile(target, 'utf8');
    expect(content).toContain('# Original');
    expect(content).toContain('--- [Memory Proposal Update:');
    expect(content).toContain('New Update');
  });

  it('rejects vault prefix escapes', async () => {
    // Attempting to trick path.resolve into a sibling folder if improperly validated
    // Example: vaultRoot is /tmp/niclaw-test-vault-xyz
    // affectedFile: ../niclaw-test-vault-xyz2/hack.md
    // Since we explicitly reject `..`, we should test if someone sneaks it in
    // But since we reject `..`, it throws early. Let's just confirm.
    await expect(
      memoryWriterService.safeWriteMemory(vaultRoot, '../niclaw-test-vault-xyz2/hack.md', '# Hack')
    ).rejects.toThrow('Directory traversal is not allowed');
  });

  it('rejects empty paths', async () => {
    await expect(
      memoryWriterService.safeWriteMemory(vaultRoot, '', '# Content')
    ).rejects.toThrow('affectedFile cannot be empty');
  });
});
