import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class RemoteClaudeCodeAgent {
    private isVmReachable = false;
    private isClaudeInstalled = false;
    private claudeVersion = '';
    private isDeepseekReachable = false;
    private lastError = '';
    private providerMode = 'UNKNOWN';
    private model = 'UNKNOWN';

    private getSshPrefix() {
        return 'ssh -o BatchMode=yes -o ConnectTimeout=10 debian@vm-niclaw.tail7a9097.ts.net';
    }

    async checkHealth() {
        this.lastError = '';
        this.providerMode = 'NOT_CONFIGURED';

        try {
            // 1. Check VM reachability
            const { stdout: vmOut } = await execAsync(`${this.getSshPrefix()} "echo ALIVE"`);
            this.isVmReachable = vmOut.trim() === 'ALIVE';

            if (!this.isVmReachable) {
                this.lastError = 'VM Unreachable';
                return this.getHealth();
            }

            // 2. Check Claude Code Version
            try {
                const { stdout: claudeOut } = await execAsync(`${this.getSshPrefix()} "export PATH=\\"/home/debian/.local/share/pnpm/bin:/home/debian/.local/bin:\\$PATH\\"; claude --version"`);
                if (claudeOut.includes('Claude Code') || claudeOut.match(/\\d+\\.\\d+/)) {
                    this.isClaudeInstalled = true;
                    this.claudeVersion = claudeOut.trim();
                }
            } catch (err: any) {
                this.isClaudeInstalled = false;
                this.lastError = 'Claude Code CLI not found in PATH';
                return this.getHealth();
            }

            // 3. Check DeepSeek Env and Direct API
            try {
                // We use a small bash script over SSH to test
                // Notice we use \$ to avoid local interpolation
                const script = `source /home/debian/.config/niclaw/.env.deepseek && if [ -z "$DEEPSEEK_API_KEY" ]; then echo "NO_KEY"; exit 1; fi && echo "BASE_URL:$DEEPSEEK_BASE_URL" && echo "MODEL:$DEEPSEEK_DEFAULT_MODEL" && curl -s -H "Authorization: Bearer $DEEPSEEK_API_KEY" https://api.deepseek.com/models`;
                const { stdout: dsOut } = await execAsync(`${this.getSshPrefix()} "${script}"`);
                
                if (dsOut.includes('NO_KEY')) {
                    this.lastError = 'DEEPSEEK_API_KEY not found in env';
                    this.providerMode = 'AUTH_FAILED';
                    return this.getHealth();
                }

                if (dsOut.includes('deepseek-chat') || dsOut.includes('deepseek-v4')) {
                    this.isDeepseekReachable = true;
                    this.providerMode = 'deepseek-anthropic-compatible';
                    
                    const modelMatch = dsOut.match(/MODEL:(.+)/);
                    if (modelMatch) {
                        this.model = modelMatch[1].trim();
                    }
                } else {
                    this.lastError = 'DeepSeek API Check Failed: ' + dsOut.substring(0, 100);
                    this.providerMode = 'AUTH_FAILED';
                    return this.getHealth();
                }

            } catch (err: any) {
                this.isDeepseekReachable = false;
                this.lastError = 'DeepSeek env/API error: ' + err.message;
                this.providerMode = 'AUTH_FAILED';
                return this.getHealth();
            }

        } catch (error: any) {
            this.lastError = error.message;
            this.isVmReachable = false;
        }
        
        return this.getHealth();
    }

    getHealth() {
        let status = 'NOT_CONFIGURED';
        if (!this.isVmReachable) status = 'OFFLINE';
        else if (!this.isClaudeInstalled) status = 'ERROR';
        else if (this.providerMode === 'AUTH_FAILED') status = 'AUTH_FAILED';
        else if (this.isDeepseekReachable && this.isClaudeInstalled) status = 'ONLINE';
        
        return {
            name: 'Remote Claude Code Agent',
            status,
            host: 'vm-niclaw',
            user: 'debian',
            cliPath: '~/.local/bin/claude',
            version: this.claudeVersion,
            providerMode: this.providerMode,
            model: this.model,
            deepseekStatus: this.isDeepseekReachable ? 'ONLINE' : 'ERROR',
            lastError: this.lastError
        };
    }

    async executeDryRun(prompt: string, onLog: (msg: string) => void) {
        onLog(`[Remote Claude] Starting Dry-Run with prompt: "${prompt}"`);
        
        const script = `export PATH="/home/debian/.local/share/pnpm/bin:/home/debian/.local/bin:$PATH" && source /home/debian/.config/niclaw/.env.deepseek && export ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic" && export ANTHROPIC_API_KEY="$DEEPSEEK_API_KEY" && echo "Reply with exactly OK and describe no changes." | claude -p "${prompt.replace(/"/g, '\\"')}"`;

        const start = Date.now();
        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        try {
            const { stdout: out, stderr: err } = await execAsync(`${this.getSshPrefix()} "${script}"`);
            stdout = out;
            stderr = err;
        } catch (err: any) {
            stdout = err.stdout || '';
            stderr = err.stderr || err.message;
            exitCode = err.code || 1;
        }

        const durationMs = Date.now() - start;
        onLog(`[Remote Claude] Execution completed. Exit code: ${exitCode}`);
        
        return {
            realInvocation: true,
            codexVersion: this.claudeVersion,
            commandExecuted: 'claude -p <prompt>',
            exitCode,
            durationMs,
            filesChanged: [],
            diffSize: 0,
            stdout,
            stderr,
            success: exitCode === 0,
            quotaExceeded: stdout.includes('quota') || stdout.includes('429'),
            dryRun: true
        };
    }

    async executePlan(prompt: string, project: { id: string, path: string, commands: any }, onLog: (msg: string) => void) {
        onLog(`[Remote Claude] Starting Plan Execution on VM for project: ${project.id}`);
        
        // Map Windows path to VM path
        let vmPath = project.path.replace(/\\/g, '/');
        if (vmPath.toLowerCase().startsWith('c:/')) {
            vmPath = '/home/debian/' + vmPath.substring(3);
        }
        
        onLog(`[Remote Claude] Mapped path: ${vmPath}`);

        // Write script locally, scp it, then execute to bypass Windows CMD escaping hell
        const tempScriptPath = require('path').join(require('os').tmpdir(), `claude_exec_${Date.now()}.sh`);
        const remoteScriptPath = `/tmp/claude_exec_${Date.now()}.sh`;
        
        const scriptContent = `#!/bin/bash
export PATH="/home/debian/.local/share/pnpm/bin:/home/debian/.local/bin:$PATH"
source /home/debian/.config/niclaw/.env.deepseek
export ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"
export ANTHROPIC_API_KEY="$DEEPSEEK_API_KEY"
cd "${vmPath}"
claude -p "${prompt.replace(/"/g, '\\"')}"
`;
        
        require('fs').writeFileSync(tempScriptPath, scriptContent);

        const start = Date.now();
        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        try {
            // Upload the script
            await execAsync(`scp -o BatchMode=yes -o ConnectTimeout=10 "${tempScriptPath}" debian@vm-niclaw.tail7a9097.ts.net:"${remoteScriptPath}"`);
            
            // Execute and capture output
            const { stdout: out, stderr: err } = await execAsync(`${this.getSshPrefix()} "bash \\"${remoteScriptPath}\\""`);
            stdout = out;
            stderr = err;
            
            // Cleanup
            await execAsync(`${this.getSshPrefix()} "rm -f \\"${remoteScriptPath}\\""`).catch(() => {});
        } catch (err: any) {
            stdout = err.stdout || '';
            stderr = err.stderr || err.message;
            exitCode = err.code || 1;
        } finally {
            require('fs').unlinkSync(tempScriptPath);
        }

        const durationMs = Date.now() - start;
        onLog(`[Remote Claude] Execution completed. Exit code: ${exitCode}`);
        
        // Parse changed files from git status on VM since claude doesn't return JSON
        let filesChanged: string[] = [];
        let diffSize = 0;
        let diffOutput = '';
        try {
            const { stdout: gitStatus } = await execAsync(`${this.getSshPrefix()} "cd \\"${vmPath}\\" && git status --porcelain"`);
            filesChanged = gitStatus.split('\n').map(line => line.substring(3).trim()).filter(line => line.length > 0);
            
            const { stdout: gitDiff } = await execAsync(`${this.getSshPrefix()} "cd \\"${vmPath}\\" && git diff HEAD"`);
            diffSize = gitDiff.length;
            diffOutput = gitDiff;
        } catch (e) {
            onLog(`[Remote Claude] Could not parse git status: ${e}`);
        }

        return {
            realInvocation: true,
            codexVersion: this.claudeVersion,
            commandExecuted: 'claude -p <prompt>',
            exitCode,
            durationMs,
            filesChanged,
            diffSize,
            diffOutput,
            stdout,
            stderr,
            success: exitCode === 0,
            quotaExceeded: stdout.includes('quota') || stderr.includes('quota') || stdout.includes('Insufficient Balance')
        };
    }
    async generatePatchProposal(prompt: string, project: { id: string, path: string, commands: any }, onLog: (msg: string) => void) {
        onLog(`[Remote Claude] Starting Patch Proposal generation for project: ${project.id}`);
        
        // Map Windows path to VM path
        let vmPath = project.path.replace(/\\/g, '/');
        if (vmPath.toLowerCase().startsWith('c:/')) {
            vmPath = '/home/debian/' + vmPath.substring(3);
        }
        
        onLog(`[Remote Claude] Mapped path: ${vmPath}`);

        // Write script locally, scp it, then execute
        const tempScriptPath = require('path').join(require('os').tmpdir(), `claude_patch_${Date.now()}.sh`);
        const remoteScriptPath = `/tmp/claude_patch_${Date.now()}.sh`;
        
        // Modified prompt: ask Claude to output the patch proposal without writing files
        const patchPrompt = `${prompt.replace(/"/g, '\\"')}

IMPORTANT INSTRUCTIONS:
- Show the exact file modifications you would make as unified diff format.
- For each file, show the full path relative to the project root.
- Use standard unified diff format with --- a/file and +++ b/file headers.
- If you cannot write files directly, output the complete proposed changes.
- Do NOT ask for approval. Just output the proposed changes.`;

        const scriptContent = `#!/bin/bash
export PATH="/home/debian/.local/share/pnpm/bin:/home/debian/.local/bin:$PATH"
source /home/debian/.config/niclaw/.env.deepseek
export ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"
export ANTHROPIC_API_KEY="$DEEPSEEK_API_KEY"
cd "${vmPath}"
claude -p "${patchPrompt}"
`;
        
        require('fs').writeFileSync(tempScriptPath, scriptContent);

        const start = Date.now();
        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        try {
            // Upload the script
            await execAsync(`scp -o BatchMode=yes -o ConnectTimeout=10 "${tempScriptPath}" debian@vm-niclaw.tail7a9097.ts.net:"${remoteScriptPath}"`);
            
            // Execute and capture output
            const { stdout: out, stderr: err } = await execAsync(`${this.getSshPrefix()} "bash \\"${remoteScriptPath}\\""`, { maxBuffer: 1024 * 1024 * 10 });
            stdout = out;
            stderr = err;
            
            // Cleanup
            await execAsync(`${this.getSshPrefix()} "rm -f \\"${remoteScriptPath}\\""`).catch(() => {});
        } catch (err: any) {
            stdout = err.stdout || '';
            stderr = err.stderr || err.message;
            exitCode = err.code || 1;
        } finally {
            require('fs').unlinkSync(tempScriptPath);
        }

        const durationMs = Date.now() - start;
        onLog(`[Remote Claude] Patch proposal generation completed. Exit code: ${exitCode}`);
        
        // Parse changed files from git status on VM (in case Claude managed to write files)
        let filesChanged: string[] = [];
        let diffSize = 0;
        let diffOutput = '';
        try {
            const { stdout: gitStatus } = await execAsync(`${this.getSshPrefix()} "cd \\"${vmPath}\\" && git status --porcelain"`);
            filesChanged = gitStatus.split('\n').map(line => line.substring(3).trim()).filter(line => line.length > 0);
            
            if (filesChanged.length > 0) {
                const { stdout: gitDiff } = await execAsync(`${this.getSshPrefix()} "cd \\"${vmPath}\\" && git diff HEAD"`, { maxBuffer: 1024 * 1024 * 5 });
                diffSize = gitDiff.length;
                diffOutput = gitDiff;

                // Reset changes on VM to keep it clean (patch will be applied locally after review)
                await execAsync(`${this.getSshPrefix()} "cd \\"${vmPath}\\" && git checkout -- . && git clean -fd"`).catch(() => {});
                onLog(`[Remote Claude] Reverted VM changes after harvesting diff (${filesChanged.length} files).`);
            }
        } catch (e) {
            onLog(`[Remote Claude] Could not parse git status: ${e}`);
        }

        return {
            realInvocation: true,
            codexVersion: this.claudeVersion,
            commandExecuted: 'claude -p <patch-prompt>',
            exitCode,
            durationMs,
            filesChanged,
            diffSize,
            diffOutput,
            stdout,
            stderr,
            success: exitCode === 0,
            quotaExceeded: stdout.includes('quota') || stderr.includes('quota') || stdout.includes('Insufficient Balance')
        };
    }
}

export const remoteClaudeCodeAgent = new RemoteClaudeCodeAgent();

