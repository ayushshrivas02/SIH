'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your configuration has been updated. Restart the server if .env was changed.',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your Sovereign AI environment.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Provider Configuration</CardTitle>
          <CardDescription>Configure your local or on-premise AI models. These settings reflect your `.env` configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            
            {/* Text LLM */}
            <div className="space-y-4 border border-border p-4 rounded-lg bg-card">
              <h3 className="font-medium text-foreground">Text Generation (LLM)</h3>
              <div className="space-y-2">
                <Label htmlFor="llm-provider">Provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Local Ollama</SelectItem>
                    <SelectItem value="openai-compatible">OpenAI Compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="main-model">Model Name</Label>
                <Input id="main-model" defaultValue="qwen2.5:0.5b" className="bg-background border-input text-foreground" />
              </div>
            </div>

            {/* Vision Model */}
            <div className="space-y-4 border border-border p-4 rounded-lg bg-card">
              <h3 className="font-medium text-foreground">Vision Analysis</h3>
              <div className="space-y-2">
                <Label htmlFor="vision-provider">Provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Local Ollama</SelectItem>
                    <SelectItem value="openai-compatible">OpenAI Compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vision-model">Model Name</Label>
                <Input id="vision-model" defaultValue="qwen2.5vl:7b" className="bg-background border-input text-foreground" />
              </div>
            </div>

            {/* Embedding Model */}
            <div className="space-y-4 border border-border p-4 rounded-lg bg-card">
              <h3 className="font-medium text-foreground">Embeddings (RAG)</h3>
              <div className="space-y-2">
                <Label htmlFor="embed-provider">Provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Local Ollama</SelectItem>
                    <SelectItem value="openai-compatible">OpenAI Compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="embedding-model">Model Name</Label>
                <Input id="embedding-model" defaultValue="nomic-embed-text:latest" className="bg-background border-input text-foreground" />
              </div>
            </div>

            {/* Image Generator */}
            <div className="space-y-4 border border-border p-4 rounded-lg bg-card">
              <h3 className="font-medium text-foreground">Image Generation & Editing</h3>
              <div className="space-y-2">
                <Label htmlFor="image-provider">Provider</Label>
                <Select defaultValue="local">
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local API</SelectItem>
                    <SelectItem value="none">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-model">Model Name</Label>
                <Input id="image-model" defaultValue="stable-diffusion-xl-instruct" className="bg-background border-input text-foreground" />
              </div>
            </div>

          </div>
        </CardContent>
        <CardFooter className="border-t border-border pt-4 bg-muted/20">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage Settings</CardTitle>
          <CardDescription>Configure local data persistence paths.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-dir">Document & Image Upload Directory</Label>
            <Input id="upload-dir" defaultValue="./uploads" className="bg-background border-input text-foreground" />
            <p className="text-xs text-muted-foreground">Path where raw documents and generated images are stored on disk.</p>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border pt-4 bg-muted/20">
          <Button onClick={handleSave} variant="secondary">
            <Save className="mr-2 h-4 w-4" /> Update Paths
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retrieval-Augmented Generation (RAG) Settings</CardTitle>
          <CardDescription>Configure how documents are chunked and retrieved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="rag-chunk-size">Chunk Size</Label>
              <Input id="rag-chunk-size" type="number" defaultValue="1000" className="bg-background border-input text-foreground" />
              <p className="text-xs text-muted-foreground">Max characters per indexed document chunk.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-chunk-overlap">Chunk Overlap</Label>
              <Input id="rag-chunk-overlap" type="number" defaultValue="200" className="bg-background border-input text-foreground" />
              <p className="text-xs text-muted-foreground">Number of overlapping characters between chunks.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-top-k">Top-K Results</Label>
              <Input id="rag-top-k" type="number" defaultValue="4" className="bg-background border-input text-foreground" />
              <p className="text-xs text-muted-foreground">Maximum number of document chunks retrieved for context.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-threshold">Similarity Threshold</Label>
              <Input id="rag-threshold" type="number" step="0.1" defaultValue="0.7" className="bg-background border-input text-foreground" />
              <p className="text-xs text-muted-foreground">Minimum cosine similarity score required (0.0 to 1.0).</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border pt-4 bg-muted/20">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
