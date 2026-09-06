'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bot, Play, Cpu, Network, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { MagicCard } from '@/components/ui/magic-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { StatusBadge } from '@/components/ui/status-badge';

const agents = [
  {
    id: 'inspection',
    name: 'Industrial Inspection Agent',
    description: 'Analyzes inspection reports, images, and sensor data to generate recommendations.',
    tools: ['Vision', 'RAG Search', 'Data Analysis'],
    model: 'Main LLM + Vision',
    status: 'online',
    color: 'text-cyan-400',
    bgColor: 'rgba(34, 211, 238, 0.15)'
  },
  {
    id: 'document-analysis',
    name: 'Document Analysis Agent',
    description: 'Cross-references uploaded documents with the Knowledge Base to extract key findings.',
    tools: ['RAG Search', 'Document Tool'],
    model: 'Main LLM',
    status: 'online',
    color: 'text-emerald-400',
    bgColor: 'rgba(16, 185, 129, 0.15)'
  },
  {
    id: 'code-audit',
    name: 'Security Code Auditor',
    description: 'Performs static and dynamic analysis on codebase to find vulnerabilities.',
    tools: ['Code Interpreter', 'Static Analyzer'],
    model: 'Main LLM',
    status: 'processing',
    color: 'text-amber-400',
    bgColor: 'rgba(251, 191, 36, 0.15)'
  }
];

export default function AgentsPage() {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [input, setInput] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleRunAgent = async (agentId: string) => {
    setRunning(agentId);
    
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, input: input[agentId] || '' }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Agent Workflow Started',
          description: 'Redirecting to agent workspace...',
        });
        router.push(`/agents/${data.taskId}`);
      } else {
        toast({
          title: 'Agent Task Failed',
          description: 'Could not complete the agent workflow.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Connection failed.',
        variant: 'destructive',
      });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-8 relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-40" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg flex items-center gap-3">
             <Cpu className="h-8 w-8 text-primary" /> Autonomous Matrix
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            Deploy specialized intelligent agents for complex, multi-step operations.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
        {agents.map((agent) => (
          <MagicCard key={agent.id} gradientColor={agent.bgColor} className="flex flex-col h-full bg-card/60 backdrop-blur-xl border border-white/5">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-3 rounded-full bg-black/40 shadow-inner border border-white/5 ${agent.color}`}>
                  <Network className="h-6 w-6" />
                </div>
                <StatusBadge 
                  status={agent.status as any} 
                  text={agent.status === 'online' ? 'Standby' : 'Processing'} 
                  pulse={agent.status === 'processing'}
                />
              </div>
              <CardTitle className="text-xl text-white font-black uppercase tracking-wide">{agent.name}</CardTitle>
              <CardDescription className="text-muted-foreground font-medium pt-2 leading-relaxed">
                {agent.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-5">
              <div className="bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner">
                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ShieldAlert className="h-3 w-3" /> Capabilities
                </p>
                <div className="flex flex-wrap gap-2">
                  {agent.tools.map(tool => (
                    <Badge key={tool} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">{tool}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner">
                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Cpu className="h-3 w-3" /> Neural Engine
                </p>
                <p className="text-sm text-white font-semibold">{agent.model}</p>
              </div>

              <div className="pt-2">
                <Input 
                  placeholder="Additional mission parameters..." 
                  className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus-visible:ring-primary focus-visible:border-primary shadow-inner"
                  value={input[agent.id] || ''}
                  onChange={(e) => setInput({ ...input, [agent.id]: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t border-white/5 pt-4 bg-black/20 mt-auto">
              <ShimmerButton 
                className={`w-full h-12 shadow-xl font-bold uppercase tracking-widest text-xs ${running === agent.id ? 'bg-amber-600' : 'bg-primary'}`} 
                onClick={() => handleRunAgent(agent.id)}
                disabled={running !== null}
              >
                {running === agent.id ? (
                  <span className="animate-pulse flex items-center"><Cpu className="mr-2 h-4 w-4 animate-spin" /> Deploying...</span>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Initialize Mission</>
                )}
              </ShimmerButton>
            </CardFooter>
          </MagicCard>
        ))}
      </div>
    </div>
  );
}
