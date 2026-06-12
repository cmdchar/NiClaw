/**
 * Chat Toolbar
 * Session selector, new session, refresh, and the workspace browser
 * entry point.  Rendered in the Header when on the Chat page.
 */
import { useMemo, useState, useEffect } from 'react';
import { RefreshCw, Bot, FolderTree, ListTree, Volume2, VolumeX, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatStore } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import { useArtifactPanel } from '@/stores/artifact-panel';
import { useSettingsStore } from '@/stores/settings';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { WORKSPACE_BROWSER_ENABLED } from '@/components/file-preview/workspace-browser-config';

type ChatToolbarProps = {
  questionDirectoryOpen?: boolean;
  questionDirectoryCount?: number;
  onToggleQuestionDirectory?: () => void;
};

export function ChatToolbar({
  questionDirectoryOpen = false,
  questionDirectoryCount = 0,
  onToggleQuestionDirectory,
}: ChatToolbarProps = {}) {
  const refresh = useChatStore((s) => s.refresh);
  const loading = useChatStore((s) => s.loading);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const agents = useAgentsStore((s) => s.agents);
  const openBrowser = useArtifactPanel((s) => s.openBrowser);
  const panelOpen = useArtifactPanel((s) => s.open);
  const panelTab = useArtifactPanel((s) => s.tab);
  const closePanel = useArtifactPanel((s) => s.close);
  const { t } = useTranslation('chat');

  const { ttsEnabled, setTtsEnabled } = useSettingsStore();
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setIsSpeaking(window.speechSynthesis.speaking);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const handleStopSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  const currentAgent = useMemo(
    () => (agents ?? []).find((agent) => agent.id === currentAgentId) ?? null,
    [agents, currentAgentId],
  );
  const currentAgentName = currentAgent?.name ?? currentAgentId;

  const browserActive = WORKSPACE_BROWSER_ENABLED && panelOpen && panelTab === 'browser';
  const questionDirectoryAvailable = questionDirectoryCount > 1 && !!onToggleQuestionDirectory;

  return (
    <div className="flex items-center gap-2">
      {/* Voice controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-full transition-all duration-200', ttsEnabled ? 'text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10' : 'text-muted-foreground')}
            onClick={() => {
              setTtsEnabled(!ttsEnabled);
              if (ttsEnabled) {
                handleStopSpeech();
              }
            }}
            aria-label="Toggle Voice Reading"
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{ttsEnabled ? 'Dezactiveaza citirea vocala' : 'Activeaza citirea vocala (TTS)'}</p>
        </TooltipContent>
      </Tooltip>

      {ttsEnabled && isSpeaking && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-red-500/30 animate-pulse animate-duration-1000"
              onClick={handleStopSpeech}
              aria-label="Stop Voice"
            >
              <Square className="h-3 w-3 fill-current" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Opreste vocea (Stop)</p>
          </TooltipContent>
        </Tooltip>
      )}

      <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground/80 dark:border-white/10 dark:bg-white/5">
        <Bot className="h-3.5 w-3.5 text-primary" />
        <span>{t('toolbar.currentAgent', { agent: currentAgentName })}</span>
      </div>
      {WORKSPACE_BROWSER_ENABLED && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', browserActive && 'bg-foreground/10 text-foreground')}
              onClick={() => (browserActive ? closePanel() : openBrowser())}
              disabled={!currentAgent?.workspace}
              aria-label={t('toolbar.workspace', '工作空间')}
            >
              <FolderTree className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('toolbar.workspace', '工作空间')}</p>
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid="chat-question-directory-toggle"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', questionDirectoryOpen && 'bg-foreground/10 text-foreground')}
            onClick={onToggleQuestionDirectory}
            disabled={!questionDirectoryAvailable}
            aria-label={t('questionDirectory.title')}
          >
            <ListTree className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('questionDirectory.title')}</p>
        </TooltipContent>
      </Tooltip>
      {/* Refresh */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refresh()}
            disabled={loading}
            aria-label={t('toolbar.refresh')}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('toolbar.refresh')}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
