'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code2, Play, Copy, Download, ServerCrash, Cpu, Activity, MemoryStick, Loader2, Bot, Terminal, TerminalSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export default function CodeGenerationStudioPage() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('auto');
  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [rawResponse, setRawResponse] = useState('');
  const [error, setError] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
          setModel(data.models[0].id);
        }
      })
      .catch(e => console.error("Failed to load models:", e));
  }, []);

  // Very basic regex to parse markdown code blocks
  const parseCodeBlocks = (text: string) => {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    const blocks: CodeBlock[] = [];
    let count = 1;
    
    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        filename: `snippet_${count}.${match[1] || 'txt'}`
      });
      count++;
    }
    
    // If no blocks found but there is text, wrap it all
    if (blocks.length === 0 && text.trim()) {
      blocks.push({
        language: 'text',
        code: text.trim(),
        filename: 'response.txt'
      });
    }
    
    setCodeBlocks(blocks);
    setActiveTab(0);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError('');
    setCodeBlocks([]);
    setRawResponse('');

    try {
      const response = await fetch('/api/code-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.response || data.code || data.text || '';
      
      setRawResponse(generatedText);
      parseCodeBlocks(generatedText);
      
    } catch (err: any) {
      console.error("Code Gen Failed:", err);
      setError(err.message || 'Failed to connect to the local inference server (localhost:8000).');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (codeBlocks[activeTab]) {
      navigator.clipboard.writeText(codeBlocks[activeTab].code);
      toast({ title: "Copied!", description: "Code copied to clipboard." });
    }
  };

  const exportFile = () => {
    if (codeBlocks[activeTab]) {
      const blob = new Blob([codeBlocks[activeTab].code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = codeBlocks[activeTab].filename || 'code.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const runSandbox = async () => {
    if (!codeBlocks[activeTab]) return;

    toast({ 
      title: "Sandbox Initiated", 
      description: "Executing code in secure isolated container...",
      duration: 3000
    });

    try {
      const response = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeBlocks[activeTab].code }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ 
          title: "Execution Complete", 
          description: `Result: ${data.result}`,
        });
        
        // Append logs or result to the raw response window
        const logsText = data.logs && data.logs.length > 0 ? `\nLogs:\n${data.logs.join('\n')}` : '';
        setRawResponse((prev) => `${prev}\n\n--- Sandbox Execution ---\nResult: ${data.result}${logsText}\nLatency: ${data.latency}ms`);
        setActiveTab(-1); // Switch to raw output view
      } else {
        toast({
          title: "Execution Failed",
          description: data.error || data.result,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Sandbox Error",
        description: err.message || "Failed to reach sandbox API.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground">Code Generation Studio</h1>
          <p className="text-sm text-muted-foreground">High-performance AI pair programming via local models</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={model} onValueChange={setModel} disabled={isGenerating}>
            <SelectTrigger className="w-[220px] bg-background border-border">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.length > 0 ? (
                availableModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))
              ) : (
                <SelectItem value="auto">Auto (Default)</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
          <ServerCrash className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Connection Error</h3>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* Left: Prompt & History */}
        <Card className="lg:w-1/3 flex flex-col border-border bg-card shadow-sm overflow-hidden rounded-xl">
          <div className="p-4 border-b border-border bg-card/50">
            <h2 className="font-semibold flex items-center gap-2 text-foreground">
              <TerminalSquare className="w-4 h-4 text-primary" /> Instruction Prompt
            </h2>
          </div>
          <div className="flex-1 p-4 flex flex-col min-h-0 relative">
            <Textarea
              placeholder="Describe the application, component, or algorithm you want to build..."
              className="flex-1 resize-none bg-background border-border/60 shadow-inner focus-visible:ring-primary p-4 rounded-lg font-mono text-sm leading-relaxed"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
            <Button 
              className="mt-4 w-full shadow-sm hover:shadow-md transition-all font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Code...</>
              ) : (
                <><Code2 className="w-4 h-4 mr-2" /> Generate Architecture</>
              )}
            </Button>
          </div>
        </Card>

        {/* Right: Code Viewer */}
        <Card className="lg:w-2/3 flex flex-col border-border bg-card shadow-sm overflow-hidden rounded-xl">
          <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto">
              {codeBlocks.length > 0 ? (
                codeBlocks.map((block, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === idx 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {block.filename}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-muted-foreground font-medium">Output Viewer</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pr-2">
              <Button variant="ghost" size="sm" onClick={copyToClipboard} disabled={codeBlocks.length === 0} className="h-8">
                <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
              <Button variant="ghost" size="sm" onClick={exportFile} disabled={codeBlocks.length === 0} className="h-8">
                <Download className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
              <div className="w-px h-4 bg-border mx-1"></div>
              <Button variant="secondary" size="sm" onClick={runSandbox} disabled={codeBlocks.length === 0 || isGenerating} className="h-8 bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 border border-blue-500/20 shadow-sm">
                <Play className="w-3.5 h-3.5 mr-1.5" /> Run in Sandbox
              </Button>
            </div>
          </div>

          <div className="flex-1 relative bg-zinc-950 overflow-hidden flex flex-col min-h-0">
             {isGenerating ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10">
                  <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800 shadow-xl mb-4">
                     <Bot className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-zinc-200 font-mono text-sm">Synthesizing instructions...</h3>
                  <p className="text-zinc-500 font-mono text-xs mt-2">Allocating compute via {model}</p>
               </div>
             ) : null}

             <ScrollArea className="flex-1 p-4 h-full">
                {codeBlocks.length > 0 && codeBlocks[activeTab] ? (
                  <pre className="font-mono text-sm text-zinc-300 leading-relaxed">
                    <code>
                      {codeBlocks[activeTab].code}
                    </code>
                  </pre>
                ) : rawResponse ? (
                  <pre className="font-mono text-sm text-zinc-400 leading-relaxed">
                    <code>{rawResponse}</code>
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 min-h-[300px]">
                    <Terminal className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-sm font-mono opacity-60">Awaiting prompt input.</p>
                  </div>
                )}
             </ScrollArea>
          </div>
        </Card>
      </div>

      {/* Footer System Stats */}
      <div className="flex items-center justify-between p-3 bg-card border border-border shadow-sm rounded-xl mt-auto">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Status</span>
              <Badge variant="outline" className="h-5 text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-sm font-bold">ONLINE</Badge>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block"></div>
            <div className="flex items-center gap-2 hidden sm:flex">
              <MemoryStick className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono text-muted-foreground">Hardware: <span className="text-foreground font-semibold">Local Node</span></span>
            </div>
         </div>
         
         <div className="flex items-center gap-2">
            <Cpu className={`w-4 h-4 ${isGenerating ? 'text-amber-500 animate-pulse' : 'text-muted-foreground'}`} />
            <span className="text-xs font-mono text-muted-foreground">
              Execution Environment: <span className="text-foreground font-semibold">Secure VM</span>
            </span>
         </div>
      </div>
    </div>
  );
}
