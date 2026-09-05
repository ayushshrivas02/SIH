'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Activity, XCircle, AlertCircle, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
        return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/30"><CheckCircle className="mr-1 h-3 w-3" /> Connected</Badge>;
      case 'NOT CONFIGURED':
        return <Badge variant="outline" className="text-muted-foreground border-border">Not Configured</Badge>;
      case 'UNAVAILABLE':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30"><XCircle className="mr-1 h-3 w-3" /> Unavailable</Badge>;
      case 'ERROR':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30"><AlertCircle className="mr-1 h-3 w-3" /> Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderCapabilities = (capabilities: any) => {
    if (!capabilities) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {capabilities.chat && <Badge variant="outline" className="text-xs">TEXT</Badge>}
        {capabilities.vision && <Badge variant="outline" className="text-xs">VISION</Badge>}
        {capabilities.embeddings && <Badge variant="outline" className="text-xs">EMBEDDING</Badge>}
        {capabilities.streaming && <Badge variant="outline" className="text-xs">STREAMING</Badge>}
      </div>
    );
  };

  const renderProviderCard = (title: string, desc: string, provider: ProviderHealthInfo | null, icon: React.ReactNode, settingKey: string, providerSettingKey: string) => {
    const currentProvider = settings[providerSettingKey] || (provider ? provider.id : 'ollama');

    if (!provider) {
      return (
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle>{title}</CardTitle>
              </div>
              {renderBadge('NOT CONFIGURED')}
            </div>
            <CardDescription>{desc}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <p className="text-sm text-muted-foreground">No provider configured for this capability.</p>
            
            <div className="pt-4 border-t border-border mt-auto">
              <span className="text-muted-foreground text-sm block mb-2">Provider Engine</span>
              <Select 
                value={currentProvider} 
                onValueChange={async (val: string | null) => { 
                  if (val) {
                    await updateSetting(providerSettingKey, val); 
                    fetchHealth();
                  }
                }}
              >
                <SelectTrigger className="w-full bg-background border-input text-foreground">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  <SelectItem value="openai-compatible">OpenAI Compatible (Remote)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      );
    }

    const currentModel = settings[settingKey] || (provider.models && provider.models.length > 0 ? provider.models[0].name : '');

    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle>{title}</CardTitle>
            </div>
            {renderBadge(provider.health.status)}
          </div>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground text-sm">Provider</span>
            <span className="text-foreground text-sm">{provider.name}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground text-sm">Type</span>
            <span className="text-foreground text-sm capitalize">{provider.type}</span>
          </div>
          {provider.health.latency !== undefined && (
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground text-sm">Latency</span>
              <span className="text-foreground text-sm">{provider.health.latency} ms</span>
            </div>
          )}
          {provider.health.error && (
            <div className="flex justify-between pb-2 text-sm text-destructive">
              <span className="text-muted-foreground mr-2">Error:</span>
              <span className="truncate">{provider.health.error}</span>
            </div>
          )}

          <div>
            <span className="text-muted-foreground text-sm block mb-1">Capabilities</span>
            {renderCapabilities(provider.capabilities)}
          </div>
          
          <div className="pt-2">
            <span className="text-muted-foreground text-sm block mb-2">Default Model</span>
            <Select 
              value={currentModel} 
              onValueChange={(val: string | null) => { if (val) updateSetting(settingKey, val); }}
              disabled={!provider.models || provider.models.length === 0}
            >
              <SelectTrigger className="w-full bg-background border-input text-foreground">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {provider.models && provider.models.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!provider.models || provider.models.length === 0) && provider.health.status === 'CONNECTED' && (
              <p className="text-xs text-muted-foreground mt-2">No models found for this provider.</p>
            )}
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <span className="text-muted-foreground text-sm block mb-2">Provider Engine</span>
            <Select 
              value={currentProvider} 
              onValueChange={async (val: string | null) => { 
                if (val) {
                  await updateSetting(providerSettingKey, val); 
                  fetchHealth();
                }
              }}
            >
              <SelectTrigger className="w-full bg-background border-input text-foreground">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                <SelectItem value="openai-compatible">OpenAI Compatible (Remote)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Model Manager</h1>
          <p className="text-muted-foreground mt-1">Manage, monitor, and configure AI providers and models.</p>
          {lastChecked && (
             <p className="text-xs text-muted-foreground mt-1">Last checked: {lastChecked.toLocaleTimeString()}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchHealth} disabled={loading} variant="outline" className="border-border bg-background">
            {loading ? 'Refreshing...' : 'Refresh Models'}
          </Button>
          <Button onClick={fetchHealth} disabled={loading}>
            {loading ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center p-12">
          <Activity className="h-8 w-8 text-blue-500 animate-pulse" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {renderProviderCard('Main Reasoning LLM', 'Primary model for agent planning and chat.', data?.text || null, <Server className="h-5 w-5 text-blue-400" />, 'default_chat_model', 'default_chat_provider')}
          {renderProviderCard('Vision Model', 'Multimodal model for image analysis.', data?.vision || null, <ImageIcon className="h-5 w-5 text-blue-400" />, 'default_vision_model', 'default_vision_provider')}
          {renderProviderCard('Embedding Model', 'Vector model for RAG and semantic search.', data?.embedding || null, <Server className="h-5 w-5 text-blue-400" />, 'default_embedding_model', 'default_embedding_provider')}
          {renderProviderCard('Image Generator', 'Model for editing and generating images.', data?.image || null, <ImageIcon className="h-5 w-5 text-purple-400" />, 'default_image_model', 'default_image_provider')}
        </div>
      )}
    </div>
  );
}
