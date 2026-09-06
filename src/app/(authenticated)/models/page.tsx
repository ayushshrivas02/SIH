'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Activity, XCircle, AlertCircle, Image as ImageIcon, CheckCircle, Cpu, RefreshCw, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MagicCard } from '@/components/ui/magic-card';

interface ProviderHealthInfo {
  id: string;
  name: string;
  type: string;
  capabilities: {
    chat?: boolean;
    vision?: boolean;
    embeddings?: boolean;
    streaming?: boolean;
  };
  health: {
    status: string;
    latency?: number;
    error?: string;
  };
  models: { id: string, name: string }[];
}

interface ModelsHealth {
  text: ProviderHealthInfo;
  vision: ProviderHealthInfo;
  embedding: ProviderHealthInfo;
  image: ProviderHealthInfo | null;
}

export default function ModelsPage() {
  const [data, setData] = useState<ModelsHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings || {});
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      setSettings(prev => ({ ...prev, [key]: value }));
      toast({ title: 'Setting updated', description: `${key} changed to ${value}` });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    }
  };

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/models/health');
      if (res.ok) {
        const json = await res.json();
        setData(json.providers);
        setLastChecked(new Date());
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to fetch model health.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <StatusBadge status="online" text="CONNECTED" pulse={false} />;
      case 'NOT CONFIGURED':
        return <StatusBadge status="offline" text="NOT CONFIGURED" pulse={false} />;
      case 'UNAVAILABLE':
        return <StatusBadge status="offline" text="UNAVAILABLE" pulse={false} />;
      case 'ERROR':
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30 font-bold uppercase tracking-widest text-[10px]"><AlertCircle className="mr-1 h-3 w-3" /> Error</Badge>;
      default:
        return <StatusBadge status="processing" text={status} />;
    }
  };

  const renderCapabilities = (capabilities: any) => {
    if (!capabilities) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {capabilities.chat && <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-white/80 font-bold tracking-widest uppercase">TEXT</Badge>}
        {capabilities.vision && <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-white/80 font-bold tracking-widest uppercase">VISION</Badge>}
        {capabilities.embeddings && <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-white/80 font-bold tracking-widest uppercase">EMBEDDING</Badge>}
        {capabilities.streaming && <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-white/80 font-bold tracking-widest uppercase">STREAMING</Badge>}
      </div>
    );
  };

  const renderProviderCard = (title: string, desc: string, provider: ProviderHealthInfo | null, icon: React.ReactNode, settingKey: string, providerSettingKey: string) => {
    const currentProvider = settings[providerSettingKey] || (provider ? provider.id : 'ollama');

    if (!provider) {
      return (
        <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="flex flex-col bg-card/60 backdrop-blur-xl border-white/5 h-full">
          <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-black/40 shadow-inner border border-white/5">
                  {icon}
                </div>
                <CardTitle className="text-sm text-white font-bold uppercase tracking-widest">{title}</CardTitle>
              </div>
              {renderBadge('NOT CONFIGURED')}
            </div>
            <CardDescription className="text-xs font-medium uppercase tracking-widest text-primary/70">{desc}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 pt-6">
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner flex flex-col items-center justify-center py-8">
               <Network className="h-8 w-8 text-white/10 mb-2" />
               <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No neural engine assigned</p>
            </div>
            
            <div className="pt-4 mt-auto border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 block mb-2">Configure Engine Connection</span>
              <Select 
                value={currentProvider} 
                onValueChange={async (val: string | null) => { 
                  if (val) {
                    await updateSetting(providerSettingKey, val); 
                    fetchHealth();
                  }
                }}
              >
                <SelectTrigger className="w-full bg-black/40 border-white/10 text-white font-semibold shadow-inner h-12 rounded-xl">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  <SelectItem value="openai-compatible">OpenAI Compatible (Remote)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </MagicCard>
      );
    }

    const currentModel = settings[settingKey] || (provider.models && provider.models.length > 0 ? provider.models[0].name : '');

    return (
      <MagicCard gradientColor={provider.health.status === 'CONNECTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'} className="flex flex-col bg-card/60 backdrop-blur-xl border-white/5 h-full">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-black/40 shadow-inner border border-white/5">
                {icon}
              </div>
              <CardTitle className="text-sm text-white font-bold uppercase tracking-widest">{title}</CardTitle>
            </div>
            {renderBadge(provider.health.status)}
          </div>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-primary/70">{desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 flex-1 pt-6">
          
          <div className="bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Provider</span>
              <span className="text-xs font-bold text-white/90">{provider.name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</span>
              <span className="text-xs font-bold text-white/90 capitalize">{provider.type}</span>
            </div>
            {provider.health.latency !== undefined && (
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Latency</span>
                <span className="text-xs font-mono text-emerald-400">{provider.health.latency} ms</span>
              </div>
            )}
            {provider.health.error && (
              <div className="flex justify-between pb-2 text-xs text-rose-400 font-mono mt-2 bg-rose-500/10 p-2 rounded-md">
                <span className="font-bold mr-2 uppercase tracking-widest">Error:</span>
                <span className="truncate">{provider.health.error}</span>
              </div>
            )}
          </div>

          <div className="bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 block mb-2 flex items-center gap-2"><Cpu className="h-3 w-3" /> Hardware Capabilities</span>
            {renderCapabilities(provider.capabilities)}
          </div>
          
          <div className="pt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Default Routing Model</span>
            <Select 
              value={currentModel} 
              onValueChange={(val: string | null) => { if (val) updateSetting(settingKey, val); }}
              disabled={!provider.models || provider.models.length === 0}
            >
              <SelectTrigger className="w-full bg-black/40 border-white/10 text-white font-mono shadow-inner h-12 rounded-xl">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                {provider.models && provider.models.map(m => (
                  <SelectItem key={m.id} value={m.id} className="font-mono">{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!provider.models || provider.models.length === 0) && provider.health.status === 'CONNECTED' && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mt-2 bg-amber-500/10 p-2 rounded-md">No models found for this provider.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 mt-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 block mb-2">Engine Provider</span>
            <Select 
              value={currentProvider} 
              onValueChange={async (val: string | null) => { 
                if (val) {
                  await updateSetting(providerSettingKey, val); 
                  fetchHealth();
                }
              }}
            >
              <SelectTrigger className="w-full bg-black/40 border-white/10 text-white font-semibold shadow-inner h-12 rounded-xl">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                <SelectItem value="openai-compatible">OpenAI Compatible (Remote)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </MagicCard>
    );
  };

  return (
    <div className="space-y-8 relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-40" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg flex items-center gap-3">
             <Server className="h-8 w-8 text-primary" /> Model Manager
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            Manage, monitor, and configure AI providers and neural models.
          </p>
          {lastChecked && (
             <p className="text-[10px] text-primary/70 mt-2 font-bold uppercase tracking-widest bg-primary/10 inline-block px-2 py-1 rounded border border-primary/20">Last synchronization: {lastChecked.toLocaleTimeString()}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchHealth} disabled={loading} variant="outline" className="h-10 text-xs font-bold uppercase tracking-widest bg-black/40 border-white/10 hover:bg-white/5 transition-colors text-white">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} /> {loading ? 'Syncing...' : 'Sync Telemetry'}
          </Button>
          <ShimmerButton onClick={fetchHealth} disabled={loading} className="h-10 px-6 font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary">
            <Activity className="mr-2 h-4 w-4" /> Execute Diagnostics
          </ShimmerButton>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center p-20 relative z-10">
          <Cpu className="h-16 w-16 text-primary animate-pulse mb-6 opacity-50" />
          <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-2">Establishing Neural Links</h3>
          <p className="text-muted-foreground text-xs uppercase tracking-widest">Polling local and remote providers...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 relative z-10">
          {renderProviderCard('Main Reasoning LLM', 'Primary neural model for agent planning and chat.', data?.text || null, <Server className="h-5 w-5 text-cyan-400" />, 'default_chat_model', 'default_chat_provider')}
          {renderProviderCard('Vision Model', 'Multimodal neural model for image analysis.', data?.vision || null, <ImageIcon className="h-5 w-5 text-purple-400" />, 'default_vision_model', 'default_vision_provider')}
          {renderProviderCard('Embedding Model', 'Vector neural model for RAG and semantic search.', data?.embedding || null, <Server className="h-5 w-5 text-emerald-400" />, 'default_embedding_model', 'default_embedding_provider')}
          {renderProviderCard('Image Generator', 'Generative model for synthesizing images.', data?.image || null, <ImageIcon className="h-5 w-5 text-amber-400" />, 'default_image_model', 'default_image_provider')}
        </div>
      )}
    </div>
  );
}
