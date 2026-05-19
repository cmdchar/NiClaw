echo "--- electron/utils/agent-config.ts (middle) ---"
sed -n '30,100p' electron/utils/agent-config.ts
echo "--- electron/utils/agent-config.ts (end) ---"
tail -n 100 electron/utils/agent-config.ts
echo "--- electron/api/routes/agents.ts (middle) ---"
sed -n '100,200p' electron/api/routes/agents.ts
echo "--- src/pages/Agents/index.tsx (components) ---"
grep -n "function AgentCard" src/pages/Agents/index.tsx
grep -n "function AddAgentDialog" src/pages/Agents/index.tsx
grep -n "function AgentSettingsModal" src/pages/Agents/index.tsx
