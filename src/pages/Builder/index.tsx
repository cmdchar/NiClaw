import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Play,
  Save,
  Settings,
  MousePointer2,
  Workflow,
  Cpu,
  Database,
  Globe,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function Builder() {
  const { t } = useTranslation('builder');
  const [nodes, setNodes] = useState([
    { id: '1', type: 'trigger', label: 'Discord Message', position: { x: 100, y: 150 } },
    { id: '2', type: 'agent', label: 'Planner Agent', position: { x: 400, y: 150 } },
    { id: '3', type: 'action', label: 'Create Document', position: { x: 700, y: 150 } },
  ]);

  return (
    <div className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      {/* Builder Toolbar */}
      <div className="h-16 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <Workflow className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-serif font-semibold tracking-tight">AI OS Visual Builder</h1>
          <Badge variant="outline" className="text-[10px] uppercase font-mono">Beta</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full gap-2">
            <Settings className="h-4 w-4" />
            Config
          </Button>
          <Button variant="outline" size="sm" className="rounded-full gap-2">
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button size="sm" className="rounded-full gap-2 shadow-lg shadow-primary/20">
            <Play className="h-4 w-4 fill-current" />
            Deploy to OS
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Components Palette */}
        <aside className="w-64 border-r border-black/5 dark:border-white/10 bg-black/[0.02] p-4 space-y-6 overflow-y-auto">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Triggers</p>
            <PaletteItem icon={<Globe className="h-4 w-4" />} label="Webhook" color="text-blue-500" />
            <PaletteItem icon={<MessageSquare className="h-4 w-4" />} label="Channel Input" color="text-green-500" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Agents</p>
            <PaletteItem icon={<Cpu className="h-4 w-4" />} label="Planner Node" color="text-purple-500" />
            <PaletteItem icon={<Cpu className="h-4 w-4" />} label="Research Node" color="text-purple-500" />
            <PaletteItem icon={<Cpu className="h-4 w-4" />} label="Execution Node" color="text-purple-500" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Knowledge</p>
            <PaletteItem icon={<Database className="h-4 w-4" />} label="Vector DB" color="text-amber-500" />
            <PaletteItem icon={<Database className="h-4 w-4" />} label="Brain Search" color="text-amber-500" />
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative bg-dot-pattern bg-[length:30px_30px] dark:bg-black/40 overflow-hidden cursor-crosshair">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <Workflow className="h-64 w-64 text-muted-foreground/10" />
          </div>

          {nodes.map(node => (
            <BuilderNode key={node.id} node={node} />
          ))}

          {/* Connection Lines (Simulated with CSS) */}
          <div className="absolute top-[185px] left-[250px] w-[150px] h-[2px] bg-primary/30" />
          <div className="absolute top-[185px] left-[550px] w-[150px] h-[2px] bg-primary/30" />

          <div className="absolute bottom-8 right-8 flex flex-col gap-2">
            <Button size="icon" variant="outline" className="rounded-full shadow-md bg-background"><Plus /></Button>
            <Button size="icon" variant="outline" className="rounded-full shadow-md bg-background"><MousePointer2 /></Button>
          </div>
        </main>
      </div>
    </div>
  );
}

function PaletteItem({ icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-black/5 hover:border-primary/30 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group">
      <div className={cn("p-2 rounded-lg bg-black/5 dark:bg-white/5", color)}>
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function BuilderNode({ node }: { node: any }) {
  return (
    <div
      className="absolute p-1 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent shadow-xl"
      style={{ left: node.position.x, top: node.position.y }}
    >
      <Card className="w-48 p-4 rounded-xl border-0 shadow-inner bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">{node.type}</span>
        </div>
        <p className="text-sm font-semibold">{node.label}</p>
        <div className="mt-4 pt-4 border-t border-black/5 flex justify-between">
          <div className="h-3 w-3 rounded-full bg-black/10 -ml-5" />
          <div className="h-3 w-3 rounded-full bg-black/10 -mr-5" />
        </div>
      </Card>
    </div>
  );
}

// Minimal Badge for the foundation
function Badge({ children, variant, className }: any) {
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", className)}>
      {children}
    </span>
  );
}

export default Builder;
