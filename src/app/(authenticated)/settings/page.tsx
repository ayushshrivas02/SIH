'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Settings2, Database, Cpu, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { MagicCard } from '@/components/ui/magic-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your configuration has been updated. Restart the server if .env was changed.',
    });
  };

  return (
    <div className="space-y-8 max-w-5xl relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-40" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg flex items-center gap-3">
             <Settings2 className="h-8 w-8 text-primary" /> Core Configuration
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            Configure your Sovereign AI environment and neural pathways.
          </p>
        </div>
      </div>

      <MagicCard gradientColor="hsl(var(--primary) / 0.15)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl relative z-10">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
            <Cpu className="h-4 w-4 text-cyan-400" /> AI Provider Configuration
          </CardTitle>
          <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">Configure your local or on-premise neural models. These settings reflect your `.env` matrix.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid sm:grid-cols-2 gap-6">
            
            {/* Text LLM */}
            <div className="space-y-4 border border-white/5 p-5 rounded-xl bg-black/40 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/90">Text Generation (LLM)</h3>
              <div className="space-y-2">
                <Label htmlFor="llm-provider" className="text-[10px] uppercase tracking-widest text-muted-foreground">Provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger className="bg-black/60 border-white/10 text-white font-mono h-10 rounded-lg">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                    <SelectItem value="ollama" className="font-mono">Local Ollama</SelectItem>
                    <SelectItem value="openai-compatible" className="font-mono">OpenAI Compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="main-model" className="text-[10px] uppercase tracking-widest text-muted-foreground">Model Name</Label>
                <Input id="main-model" defaultValue="qwen2.5:0.5b" className="bg-black/60 border-white/10 text-emerald-400 font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary" />
              </div>
            </div>

            {/* Vision Model */}
            <div className="space-y-4 border border-white/5 p-5 rounded-xl bg-black/40 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/90">Vision Analysis</h3>
              <div className="space-y-2">
                <Label htmlFor="vision-provider" className="text-[10px] uppercase tracking-widest text-muted-foreground">Provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger className="bg-black/60 border-white/10 text-white font-mono h-10 rounded-lg">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                    <SelectItem value="ollama" className="font-mono">Local Ollama</SelectItem>
                    <SelectItem value="openai-compatible" className="font-mono">OpenAI Compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vision-model" className="text-[10px] uppercase tracking-widest text-muted-foreground">Model Name</Label>
                <Input id="vision-model" defaultValue="qwen2.5vl:7b" className="bg-black/60 border-white/10 text-emerald-400 font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary" />
              </div>
            </div>

            {/* Embedding Model */}
            <div className="space-y-4 border border-white/5 p-5 rounded-xl bg-black/40 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/90">Embeddings (RAG)</h3>
              <div className="space-y-2">
                <Label htmlFor="embed-provider" className="text-[10px] uppercase tracking-widest text-muted-foreground">Provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger className="bg-black/60 border-white/10 text-white font-mono h-10 rounded-lg">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                    <SelectItem value="ollama" className="font-mono">Local Ollama</SelectItem>
                    <SelectItem value="openai-compatible" className="font-mono">OpenAI Compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="embedding-model" className="text-[10px] uppercase tracking-widest text-muted-foreground">Model Name</Label>
                <Input id="embedding-model" defaultValue="nomic-embed-text:latest" className="bg-black/60 border-white/10 text-emerald-400 font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary" />
              </div>
            </div>

            {/* Image Generator */}
            <div className="space-y-4 border border-white/5 p-5 rounded-xl bg-black/40 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/90">Image Generation & Editing</h3>
              <div className="space-y-2">
                <Label htmlFor="image-provider" className="text-[10px] uppercase tracking-widest text-muted-foreground">Provider</Label>
                <Select defaultValue="local">
                  <SelectTrigger className="bg-black/60 border-white/10 text-white font-mono h-10 rounded-lg">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                    <SelectItem value="local" className="font-mono">Local API</SelectItem>
                    <SelectItem value="none" className="font-mono">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-model" className="text-[10px] uppercase tracking-widest text-muted-foreground">Model Name</Label>
                <Input id="image-model" defaultValue="stable-diffusion-xl-instruct" className="bg-black/60 border-white/10 text-emerald-400 font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary" />
              </div>
            </div>

          </div>
        </CardContent>
        <CardFooter className="border-t border-white/5 pt-6 bg-black/20">
          <ShimmerButton onClick={handleSave} className="h-12 px-8 font-bold uppercase tracking-widest text-xs bg-primary shadow-xl">
            <Save className="mr-2 h-4 w-4" /> Commit Configuration
          </ShimmerButton>
        </CardFooter>
      </MagicCard>

      <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl relative z-10">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
            <HardDrive className="h-4 w-4 text-emerald-400" /> Storage Subsystem
          </CardTitle>
          <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">Configure local data persistence pathways.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="upload-dir" className="text-[10px] uppercase tracking-widest text-muted-foreground">Document & Image Upload Directory</Label>
            <Input id="upload-dir" defaultValue="./uploads" className="bg-black/40 border-white/10 text-emerald-400 font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary max-w-xl" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Path where raw artifacts are stored on disk.</p>
          </div>
        </CardContent>
        <CardFooter className="border-t border-white/5 pt-6 bg-black/20">
          <Button onClick={handleSave} variant="outline" className="h-12 px-8 font-bold uppercase tracking-widest text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
            <Save className="mr-2 h-4 w-4" /> Update Pathways
          </Button>
        </CardFooter>
      </MagicCard>

      <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl relative z-10">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
            <Database className="h-4 w-4 text-purple-400" /> Neural RAG Engine
          </CardTitle>
          <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">Configure vector processing and retrieval parameters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label htmlFor="rag-chunk-size" className="text-[10px] uppercase tracking-widest text-muted-foreground">Chunk Size</Label>
              <Input id="rag-chunk-size" type="number" defaultValue="1000" className="bg-black/40 border-white/10 text-emerald-400 font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Max characters per indexed chunk.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-chunk-overlap" className="text-[10px] uppercase tracking-widest text-muted-foreground">Chunk Overlap</Label>
              <Input id="rag-chunk-overlap" type="number" defaultValue="200" className="bg-black/40 border-white/10 text-emerald-400 font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Overlap margin between chunks.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-top-k" className="text-[10px] uppercase tracking-widest text-muted-foreground">Top-K Vectors</Label>
              <Input id="rag-top-k" type="number" defaultValue="4" className="bg-black/40 border-white/10 text-emerald-400 font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Max chunks retrieved for context window.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-threshold" className="text-[10px] uppercase tracking-widest text-muted-foreground">Similarity Threshold</Label>
              <Input id="rag-threshold" type="number" step="0.1" defaultValue="0.7" className="bg-black/40 border-white/10 text-emerald-400 font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Minimum cosine matching score (0.0 to 1.0).</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-white/5 pt-6 bg-black/20">
          <Button onClick={handleSave} variant="outline" className="h-12 px-8 font-bold uppercase tracking-widest text-xs border-purple-500/20 text-purple-400 hover:bg-purple-500/10">
            <Save className="mr-2 h-4 w-4" /> Save RAG Parameters
          </Button>
        </CardFooter>
      </MagicCard>
    </div>
  );
}
