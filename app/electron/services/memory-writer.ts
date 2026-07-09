import { resolve, relative, isAbsolute, dirname, join, extname } from 'node:path';
import { realpath, mkdir, writeFile, appendFile, rename, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export class MemoryWriterService {
  /**
   * Safely writes content to the target file inside the vault root.
   * Enforces strict path normalization and blocks traversals or symlink escapes.
   */
  public async safeWriteMemory(vaultRoot: string, affectedFile: string, proposedContent: string): Promise<void> {
    // 1. Basic path validations
    if (!affectedFile) {
      throw new Error('affectedFile cannot be empty');
    }
    if (isAbsolute(affectedFile)) {
      throw new Error('affectedFile must be a relative path');
    }
    if (extname(affectedFile) !== '.md') {
      throw new Error('Only .md files are allowed');
    }
    if (affectedFile.includes('..')) {
      throw new Error('Directory traversal is not allowed');
    }

    // 2. Resolve vault root realpath to prevent symlink tricks on the root itself
    let realVaultRoot: string;
    try {
      realVaultRoot = await realpath(vaultRoot);
    } catch (err) {
      throw new Error(`Vault root does not exist or cannot be resolved: ${vaultRoot}`);
    }

    // 3. Resolve the target path
    const targetPath = resolve(realVaultRoot, affectedFile);

    // 4. Verify the target path stays strictly inside the vault
    const rel = relative(realVaultRoot, targetPath);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error('Target path escapes the vault root');
    }

    // 5. Ensure the target directory exists
    const targetDir = dirname(targetPath);
    await mkdir(targetDir, { recursive: true });

    // 6. Verify the resolved target dir realpath is still inside the vault
    // (Prevents symlinked subdirectories from escaping)
    const realTargetDir = await realpath(targetDir);
    const dirRel = relative(realVaultRoot, realTargetDir);
    if (dirRel.startsWith('..') || isAbsolute(dirRel)) {
      throw new Error('Target directory resolves outside the vault root');
    }

    // 7. Check if file exists to handle safe overwrite / append
    let fileExists = false;
    try {
      await stat(targetPath);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    if (fileExists) {
      // Safe behavior if target exists: Append-only with clear marker
      const appendContent = `\n\n--- [Memory Proposal Update: ${new Date().toISOString()}] ---\n\n${proposedContent}\n`;
      await appendFile(targetPath, appendContent, 'utf8');
    } else {
      // Atomic write for new files: write to a temporary file in the same dir, then rename
      const tempPath = join(realTargetDir, `.${randomUUID()}.tmp`);
      try {
        await writeFile(tempPath, proposedContent, 'utf8');
        await rename(tempPath, targetPath);
      } catch (err) {
        // Cleanup temp file if rename or write fails
        try {
          const { unlink } = await import('node:fs/promises');
          await unlink(tempPath);
        } catch { /* ignore cleanup error */ }
        throw err;
      }
    }
  }
}

export const memoryWriterService = new MemoryWriterService();
