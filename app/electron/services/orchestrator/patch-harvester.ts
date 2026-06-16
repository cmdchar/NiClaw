import { promises as fs } from 'fs';
import { join } from 'path';
import { getDataDir } from '../../utils/paths';
import { PatchProposal } from './types';

/**
 * PatchHarvester extracts structured patch proposals from Claude Code CLI output.
 * 
 * It parses:
 * 1. Git diff output from the VM (primary - actual on-disk changes)
 * 2. Claude stdout for proposed file modifications (fallback - when Claude can't apply changes)
 * 
 * It classifies risk and persists patches to disk without applying anything.
 */
export class PatchHarvester {

  private getPatchDir(): string {
    return join(getDataDir(), 'command-center', 'patches');
  }

  /**
   * Extract a structured PatchProposal from execution results.
   */
  async harvestPatch(
    taskId: string,
    claudeStdout: string,
    filesChanged: string[],
    diffOutput: string,
    planner: string,
    executor: string
  ): Promise<PatchProposal | null> {
    // 1. Determine the diff source
    let diff = diffOutput || '';
    let extractedFiles = [...filesChanged];

    // If no git diff available, try to parse Claude's stdout for proposed changes
    if (!diff && claudeStdout) {
      const parsed = this.parseClaudeOutput(claudeStdout);
      diff = parsed.diff;
      if (parsed.files.length > 0 && extractedFiles.length === 0) {
        extractedFiles = parsed.files;
      }
    }

    if (extractedFiles.length === 0 && !diff) {
      if (claudeStdout && claudeStdout.length > 50) {
          // Output contains text but we couldn't extract structured files or diff.
          // Throw specific error to trigger patch_extraction_failed
          const err = new Error('PATCH_EXTRACTION_FAILED');
          (err as any).rawOutput = claudeStdout;
          throw err;
      }
      // Legitimate no_changes
      return null;
    }

    // 2. Generate summary from Claude output
    const summary = this.extractSummary(claudeStdout, extractedFiles);

    // 3. Classify risk
    const riskLevel = this.classifyRisk(extractedFiles, diff);

    // 4. Build the proposal (policy validation will be added by the orchestrator)
    const proposal: PatchProposal = {
      taskId,
      planner,
      executor,
      summary,
      riskLevel,
      filesChanged: extractedFiles,
      diff,
      rawOutput: claudeStdout.substring(0, 20000), // Cap at 20KB
      policyValidation: { valid: true }, // Will be overwritten by policy engine
      createdAt: new Date().toISOString(),
    };

    // 5. Persist to disk
    await this.savePatch(proposal);

    return proposal;
  }

  /**
   * Parse Claude CLI stdout for file modification proposals.
   * Claude outputs proposed changes as markdown code blocks with filenames.
   */
  private parseClaudeOutput(stdout: string): { diff: string; files: string[] } {
    const files: string[] = [];
    const diffBlocks: string[] = [];

    // Pattern 0: Try to parse JSON if --output-format json was used
    try {
      const jsonStart = stdout.indexOf('{');
      if (jsonStart !== -1) {
        const jsonStr = stdout.substring(jsonStart);
        const parsed = JSON.parse(jsonStr);
        if (parsed && parsed.permission_denials && Array.isArray(parsed.permission_denials)) {
          for (const denial of parsed.permission_denials) {
            const tInput = denial.tool_input;
            if (denial.tool_name === 'Replace' && tInput) {
              const file = tInput.file_path || 'unknown';
              const oldStr = tInput.old_string || '';
              const newStr = tInput.new_string || '';
              const diff = `--- a/${file}\n+++ b/${file}\n@@ -1,1 +1,1 @@\n-${oldStr.split('\\n').join('\\n-')}\n+${newStr.split('\\n').join('\\n+')}`;
              diffBlocks.push(diff);
              files.push(file);
            } else if (denial.tool_name === 'Edit' && tInput) {
              const file = tInput.file_path || 'unknown';
              const oldStr = tInput.old_string || '';
              const newStr = tInput.new_string || '';
              const diff = `--- a/${file}\n+++ b/${file}\n@@ -1,1 +1,1 @@\n-${oldStr.split('\\n').join('\\n-')}\n+${newStr.split('\\n').join('\\n+')}`;
              diffBlocks.push(diff);
              files.push(file);
            } else if (denial.tool_name === 'Write' && tInput) {
              const file = tInput.file_path || 'unknown';
              const diff = `--- a/${file}\n+++ b/${file}\n@@ -1,0 +1,1 @@\n+${(tInput.content || '').split('\\n').join('\\n+')}`;
              diffBlocks.push(diff);
              files.push(file);
            }
          }
        }
        
        // If JSON contains a text result, use it for the regex fallbacks
        if (parsed.result && typeof parsed.result === 'string') {
          stdout = parsed.result;
        }
      }
    } catch (e) {
      // Not JSON or parse error, fall through
    }

    // Pattern 1: Look for unified diff blocks in the output
    const diffRegex = /^(---\s+(?:a\/.*|\/dev\/null)\n\+\+\+\s+(?:b\/.*|\/dev\/null)\n(?:@@.*@@.*\n(?:[+ -].*\n?)*))/gm;
    let match: RegExpExecArray | null;
    while ((match = diffRegex.exec(stdout)) !== null) {
      diffBlocks.push(match[1]);
      // Extract filename from +++ line
      const fileMatch = match[1].match(/\+\+\+\s+(?:b\/)?(.+)/);
      if (fileMatch && fileMatch[1].trim() !== '/dev/null') {
        files.push(fileMatch[1].trim());
      } else {
        const fileMatchA = match[1].match(/---\s+(?:a\/)?(.+)/);
        if (fileMatchA && fileMatchA[1].trim() !== '/dev/null') {
          files.push(fileMatchA[1].trim());
        }
      }
    }

    // Pattern 2: Look for "Edit file: path/to/file" or "File: path/to/file" patterns
    const fileRefRegex = /(?:(?:Edit|Modify|Create|Update)\s+(?:file:\s*)?|File:\s+)([^\s]+\.[a-zA-Z]+)/gi;
    while ((match = fileRefRegex.exec(stdout)) !== null) {
      const f = match[1].trim();
      if (!files.includes(f)) {
        files.push(f);
      }
    }

    // Pattern 3: Look for code blocks with filenames (```kotlin path/to/file.kt)
    const codeBlockRegex = /```(?:\w+)?\s+([\w/.]+\.\w+)\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(stdout)) !== null) {
      const filename = match[1].trim();
      if (!files.includes(filename)) {
        files.push(filename);
      }
      // Construct a pseudo-diff from the code block
      diffBlocks.push(`--- a/${filename}\n+++ b/${filename}\n@@ -1,0 +1,${match[2].split('\n').length} @@\n${match[2].split('\n').map(l => '+' + l).join('\n')}`);
    }

    return {
      diff: diffBlocks.join('\n\n'),
      files,
    };
  }

  /**
   * Extract a human-readable summary from Claude's output.
   */
  private extractSummary(stdout: string, files: string[]): string {
    // Try to find a summary line in Claude's output
    const summaryPatterns = [
      /(?:Summary|Changes|I (?:will|would|have))\s*:?\s*(.{20,200})/i,
      /(?:Here's what I (?:did|changed|modified))\s*:?\s*(.{20,200})/i,
    ];

    for (const pattern of summaryPatterns) {
      const match = stdout.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback: generate from file list
    if (files.length > 0) {
      return `Proposed changes to ${files.length} file(s): ${files.join(', ')}`;
    }

    return 'Patch proposal extracted from Claude Code execution';
  }

  /**
   * Classify risk based on files changed and diff content.
   */
  private classifyRisk(files: string[], diff: string): PatchProposal['riskLevel'] {
    // HIGH risk indicators
    const highRiskPatterns = [
      /\.env/i, /secret/i, /credential/i, /password/i, /api.?key/i,
      /\.pem$/i, /\.key$/i, /id_rsa/i, /token/i,
      /build\.gradle/i, /package\.json/i, /pom\.xml/i,
      /AndroidManifest/i, /proguard/i,
    ];

    for (const pattern of highRiskPatterns) {
      for (const f of files) {
        if (pattern.test(f)) return 'HIGH';
      }
      if (pattern.test(diff)) return 'HIGH';
    }

    // MEDIUM risk: config files, many files, or large diffs
    if (files.length > 5) return 'MEDIUM';
    if (diff.length > 5000) return 'MEDIUM';

    const mediumRiskPatterns = [
      /config/i, /settings/i, /\.xml$/i, /\.json$/i,
    ];
    for (const pattern of mediumRiskPatterns) {
      for (const f of files) {
        if (pattern.test(f)) return 'MEDIUM';
      }
    }

    return 'LOW';
  }

  /**
   * Persist the patch proposal to disk.
   */
  async savePatch(proposal: PatchProposal): Promise<void> {
    const dir = this.getPatchDir();
    await fs.mkdir(dir, { recursive: true });

    // Save structured JSON
    const jsonPath = join(dir, `${proposal.taskId}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(proposal, null, 2), 'utf8');

    // Save raw diff
    const diffPath = join(dir, `${proposal.taskId}.diff`);
    await fs.writeFile(diffPath, proposal.diff, 'utf8');
  }

  /**
   * Load a patch proposal from disk.
   */
  async loadPatch(taskId: string): Promise<PatchProposal | null> {
    try {
      const jsonPath = join(this.getPatchDir(), `${taskId}.json`);
      const data = await fs.readFile(jsonPath, 'utf8');
      return JSON.parse(data) as PatchProposal;
    } catch (e) {
      return null;
    }
  }
}

export const patchHarvester = new PatchHarvester();
