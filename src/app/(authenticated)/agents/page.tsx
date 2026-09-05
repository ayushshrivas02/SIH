'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bot, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const agents = [
  {
    id: 'inspection',
    name: 'Industrial Inspection Agent',
    description: 'Analyzes inspection reports, images, and sensor data to generate recommendations.',
    tools: ['Vision', 'RAG Search', 'Data Analysis'],
    model: 'Main LLM + Vision',
  },
  {
    id: 'document-analysis',
    name: 'Document Analysis Agent',
    description: 'Cross-references uploaded documents with the Knowledge Base to extract key findings.',
    tools: ['RAG Search', 'Document Tool'],
    model: 'Main LLM',
  },
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Agentic AI Engine</h1>
          <p className="text-muted-foreground mt-1">Launch autonomous planning agents for complex tasks.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-primary" />
                  <CardTitle className="text-xl text-foreground">{agent.name}</CardTitle>
                </div>
                <Badge variant="outline" className="text-muted-foreground border-border bg-muted/30">Ready</Badge>
              </div>
              <CardDescription className="pt-2">{agent.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tools</p>
                <div className="flex flex-wrap gap-2">
                  {agent.tools.map(tool => (
                    <Badge key={tool} variant="secondary">{tool}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Model Routing</p>
                <p className="text-sm text-foreground">{agent.model}</p>
              </div>
              <div className="pt-2">
                <Input 
                  placeholder="Additional instructions..." 
                  className="bg-background border-border text-foreground"
                  value={input[agent.id] || ''}
                  onChange={(e) => setInput({ ...input, [agent.id]: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t border-border pt-4 bg-muted/20">
              <Button 
                className="w-full" 
                onClick={() => handleRunAgent(agent.id)}
                disabled={running !== null}
              >
                {running === agent.id ? 'Agent Running...' : <><Play className="mr-2 h-4 w-4" /> Run Agent Workflow</>}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
