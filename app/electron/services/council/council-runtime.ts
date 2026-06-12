import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AgentResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentProvider {
  execute(prompt: string): Promise<AgentResult>;
}

export class HermesProvider implements AgentProvider {
  private workdir: string;

  constructor(workdir: string) {
    this.workdir = workdir;
  }

  async execute(prompt: string): Promise<AgentResult> {
    try {
      // Escape prompt safely for shell
      const escapedPrompt = prompt.replace(/"/g, '\\"');
      // Running hermes via uv
      const command = `uv run hermes chat --quiet --max-turns 6 -q "${escapedPrompt}"`;
      
      const { stdout, stderr } = await execAsync(command, { cwd: this.workdir });
      
      return {
        success: true,
        output: stdout.trim(),
        error: stderr ? stderr.trim() : undefined
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message || String(error)
      };
    }
  }
}

// Stubs for future extensions
export class OpenAIProvider implements AgentProvider {
  async execute(prompt: string): Promise<AgentResult> {
    throw new Error('Not implemented');
  }
}

export class ClaudeProvider implements AgentProvider {
  async execute(prompt: string): Promise<AgentResult> {
    throw new Error('Not implemented');
  }
}
