export interface AgentSummary {
  id: string;
  name: string;
  isDefault: boolean;
  modelDisplay: string;
  modelRef?: string | null;
  overrideModelRef?: string | null;
  inheritedModel: boolean;
  workspace: string;
  agentDir: string;
  mainSessionKey: string;
  channelTypes: string[];
  // AI OS Fields
  description?: string;
  role?: string;
  parentAgentId?: string;
  tags?: string[];
  brainPath?: string;
  mcpServers?: Array<{ name: string; command: string; args?: string[] }>;
  paused?: boolean;
  currentTask?: string;
  permissions?: {
    fileWrite?: boolean;
    cmdExecute?: 'always' | 'ask' | 'never';
    webSearch?: boolean;
    sandbox?: boolean;
    fileWriteApproval?: boolean;
    webSearchApproval?: boolean;
    sandboxApproval?: boolean;
    shellApproval?: boolean;
  };
  systemPrompt?: string;
  sandboxPath?: string;
}

export interface AgentsSnapshot {
  agents: AgentSummary[];
  defaultAgentId: string;
  defaultModelRef?: string | null;
  configuredChannelTypes: string[];
  channelOwners: Record<string, string>;
  channelAccountOwners: Record<string, string>;
}
