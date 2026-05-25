import { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  RefreshCw, 
  Cpu, 
  Bot, 
  Shield, 
  Key, 
  ExternalLink, 
  Settings,
  ArrowLeft,
  ArrowRight,
  Home,
  ZoomIn,
  ZoomOut,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackUiEvent } from '@/lib/telemetry';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settings';

interface AgentPortalItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  port: number;
  customUrl?: string;
  description: string;
  badge: string;
  themeColor: string;
}

export function Portal() {
  const { remoteHostUrl } = useSettingsStore() as any;

  // Default server IP from VM
  const [serverIp, setServerIp] = useState(() => {
    const stored = localStorage.getItem('clawx_portal_server_ip');
    if (stored) return stored;

    if (remoteHostUrl) {
      try {
        const url = new URL(remoteHostUrl);
        if (url.hostname) return url.hostname;
      } catch (e) {
        // Fallback
      }
    }
    return '10.10.1.219';
  });
  
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [activeTab, setActiveTab] = useState('openclaw');
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const webviewRef = useRef<any>(null);

  // Webview navigation HUD states
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [guestUrl, setGuestUrl] = useState('');

  useEffect(() => {
    trackUiEvent('portal.page_viewed', { activeTab });
  }, [activeTab]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const updateNavigationState = () => {
      try {
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
        setGuestUrl(webview.getURL());
      } catch (e) {
        // Webview might not be fully initialized yet
      }
    };

    const handleLoadStop = () => {
      setLoading(false);
      updateNavigationState();
    };

    const handleNavigate = (e: any) => {
      if (e.url) {
        setGuestUrl(e.url);
      }
      updateNavigationState();
    };

    webview.addEventListener('did-stop-loading', handleLoadStop);
    webview.addEventListener('dom-ready', handleLoadStop);
    webview.addEventListener('did-fail-load', handleLoadStop);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);

    return () => {
      webview.removeEventListener('did-stop-loading', handleLoadStop);
      webview.removeEventListener('dom-ready', handleLoadStop);
      webview.removeEventListener('did-fail-load', handleLoadStop);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
    };
  }, [activeTab, iframeKey]);

  const saveServerIp = (ip: string) => {
    const trimmed = ip.trim();
    setServerIp(trimmed);
    localStorage.setItem('clawx_portal_server_ip', trimmed);
    setIframeKey((prev) => prev + 1);
    toast.success(`IP-ul portalului a fost actualizat: ${trimmed}`);
  };

  const portalAgents: AgentPortalItem[] = [
    {
      id: 'openclaw',
      name: 'OpenClaw / NiClaw',
      icon: <Cpu className="h-4 w-4" />,
      port: 18789,
      description: 'Orchestratorul principal de agenți și workspace din rețeaua vm-niclaw.',
      badge: 'Active Engine',
      themeColor: 'from-cyan-500 to-blue-500'
    },
    {
      id: 'openhuman',
      name: 'OpenHuman Core',
      icon: <Bot className="h-4 w-4" />,
      port: 7788,
      description: 'Core-ul OpenHuman local pentru procesare semantică și asistență avansată.',
      badge: 'Cognitive Hub',
      themeColor: 'from-green-500 to-emerald-500'
    },
    {
      id: 'hermes',
      name: 'Hermes Console',
      icon: <Key className="h-4 w-4" />,
      port: 7789,
      description: 'Inference Playground local și gestionarea creditelor pentru modelul Hermes.',
      badge: 'Playground',
      themeColor: 'from-purple-500 to-indigo-500'
    },
    {
      id: 'gemini',
      name: 'Gemini Console',
      icon: <Shield className="h-4 w-4" />,
      port: 80,
      customUrl: 'https://aistudio.google.com',
      description: 'Google AI Studio Console pentru testarea și configurarea modelelor Gemini.',
      badge: 'Google Cloud',
      themeColor: 'from-orange-500 to-red-500'
    }
  ];

  const activeAgent = portalAgents.find((a) => a.id === activeTab) || portalAgents[0];

  const getPortalUrl = (agent: AgentPortalItem) => {
    if (agent.customUrl) return agent.customUrl;
    let url = `http://${serverIp}:${agent.port}`;
    if (agent.id === 'openclaw') {
      const token = (useSettingsStore.getState() as any).remoteHostToken || '35c6ae8e7a685718dfb4a45a1f2982d5';
      url += `/?token=${token}`;
    }
    return url;
  };

  const handleRefresh = () => {
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenExternal = () => {
    const url = guestUrl || getPortalUrl(activeAgent);
    window.electron.openExternal(url);
  };

  // Navigation handlers
  const handleGoBack = () => {
    if (webviewRef.current && canGoBack) {
      webviewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webviewRef.current && canGoForward) {
      webviewRef.current.goForward();
    }
  };

  const handleZoomOut = () => {
    if (webviewRef.current) {
      const nextZoom = Math.max(-2, zoomLevel - 0.5);
      setZoomLevel(nextZoom);
      webviewRef.current.setZoomLevel(nextZoom);
    }
  };

  const handleZoomIn = () => {
    if (webviewRef.current) {
      const nextZoom = Math.min(3, zoomLevel + 0.5);
      setZoomLevel(nextZoom);
      webviewRef.current.setZoomLevel(nextZoom);
    }
  };

  return (
    <div data-testid="portal-page" className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full p-4 md:p-8">
        
        {/* Top bar with active title and configurations */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 shrink-0 gap-4">
          <div>
            <h1 className="text-3xl font-serif text-foreground mb-1 font-normal tracking-tight flex items-center gap-2">
              <Globe className="h-7 w-7 text-cyan-500" />
              Agent Portal
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Consola centralizată pentru dashboard-urile agenților din rețeaua ta
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* IP/Host Config */}
            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full px-3 py-1.5 text-xs font-mono">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Host:</span>
              {isEditingIp ? (
                <input
                  autoFocus
                  defaultValue={serverIp}
                  onBlur={(e) => {
                    saveServerIp(e.target.value);
                    setIsEditingIp(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveServerIp(e.currentTarget.value);
                      setIsEditingIp(false);
                    }
                  }}
                  className="bg-transparent border-0 outline-none text-foreground w-32 focus:ring-0 p-0 text-xs font-mono"
                />
              ) : (
                <button
                  onClick={() => setIsEditingIp(true)}
                  className="text-foreground hover:text-cyan-400 font-bold underline transition-colors"
                  title="Click to edit portal host IP"
                >
                  {serverIp}
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 text-xs rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Reincarca
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
              className="h-9 text-xs rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              Extern
            </Button>
          </div>
        </div>

        {/* Horizontal Navigation Chips */}
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          {portalAgents.map((agent) => {
            const isActive = activeTab === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => {
                  setActiveTab(agent.id);
                  setLoading(true);
                  setZoomLevel(0);
                  setGuestUrl('');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${agent.themeColor} text-white border-transparent shadow-md scale-105`
                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground'
                }`}
              >
                {agent.icon}
                {agent.name}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-muted-foreground'
                }`}>
                  {agent.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Description Banner */}
        <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3 rounded-2xl mb-4 shrink-0 flex items-start gap-3">
          <div className={`p-2 rounded-xl bg-gradient-to-r ${activeAgent.themeColor} text-white shrink-0`}>
            {activeAgent.icon}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{activeAgent.name}</p>
            <p className="text-tiny text-muted-foreground mt-0.5">{activeAgent.description}</p>
            <p className="text-[10px] text-cyan-500 font-mono mt-1">Target Address: {getPortalUrl(activeAgent)}</p>
          </div>
        </div>

        {/* Dynamic Iframe Portal Layout */}
        <div className="flex-1 min-h-0 bg-white dark:bg-card border border-black/10 dark:border-white/10 rounded-3xl relative overflow-hidden shadow-inner flex flex-col">
          
          {/* Browser HUD Navigation Bar */}
          <div className="h-12 border-b border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex items-center justify-between px-4 shrink-0 gap-3 z-20">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={!canGoBack}
                onClick={handleGoBack}
                className="h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-foreground disabled:opacity-30"
                title="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!canGoForward}
                onClick={handleGoForward}
                className="h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-foreground disabled:opacity-30"
                title="Forward"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
                title="Reload"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setLoading(true);
                  setIframeKey(prev => prev + 1);
                  setZoomLevel(0);
                }}
                className="h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
                title="Go to tab home"
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>

            {/* Address Bar */}
            <div className="flex-1 max-w-2xl bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-full h-8 flex items-center px-3 gap-2 font-mono text-[10px] text-muted-foreground select-all overflow-hidden truncate">
              <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="truncate text-foreground/80">{guestUrl || getPortalUrl(activeAgent)}</span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className="h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-foreground/75 min-w-[40px] text-center">
                {Math.round((1 + zoomLevel * 0.2) * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className="h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 top-12 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-t-cyan-500 border-r-transparent border-b-cyan-500 border-l-transparent animate-spin"></div>
                <div className="absolute w-6 h-6 rounded-full border-2 border-t-transparent border-r-emerald-500 border-b-transparent border-l-emerald-500 animate-spin animate-reverse"></div>
              </div>
              <p className="mt-4 text-xs font-mono text-cyan-500">SE CONECTEAZĂ LA PORTAL...</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">{getPortalUrl(activeAgent)}</p>
            </div>
          )}

          {/* @ts-ignore */}
          <webview
            ref={webviewRef}
            key={`${activeTab}-${iframeKey}`}
            src={getPortalUrl(activeAgent)}
            style={{ width: '100%', height: 'calc(100% - 3rem)', border: 'none', background: 'white' }}
            allowpopups={true}
          />
        </div>

      </div>
    </div>
  );
}

export default Portal;
