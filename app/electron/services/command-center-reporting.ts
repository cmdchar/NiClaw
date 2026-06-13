import { writeCommandCenterReport } from './dev-vault-service';
import type { DevWorkspaceScanResult } from './dev-workspace-scanner';
import type { CommandCenterStatus } from './server-health';

export async function createCommandCenterReport(input: {
  status: CommandCenterStatus;
  projects: DevWorkspaceScanResult;
}): Promise<{ path: string }> {
  const dirtyProjects = input.projects.projects.filter((project) => project.git.dirty);
  const body = [
    '## Status',
    '',
    `- Generated: ${input.status.generatedAt}`,
    `- Host: ${input.status.host.hostname} (${input.status.host.platform})`,
    `- Projects detected: ${input.projects.projects.length}`,
    `- Dirty git projects: ${dirtyProjects.length}`,
    '',
    '## Dirty Projects',
    '',
    ...(
      dirtyProjects.length > 0
        ? dirtyProjects.map((project) => `- ${project.name} (${project.git.branch || 'unknown'}): ${project.git.changedFiles ?? 0} changed files`)
        : ['- None']
    ),
    '',
  ].join('\n');

  return writeCommandCenterReport({
    title: 'Command Center Report',
    body,
  });
}

