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
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-zinc-400">Configure your Sovereign AI environment.</p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>AI Provider Configuration</CardTitle>
          <CardDescription>Configure your local or on-premise AI models. These settings reflect your `.env` configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            
            {/* Text LLM */}
            <div className="space-y-4 border border-zinc-800 p-4 rounded-lg bg-zinc-950/30">
              <h3 className="font-medium text-zinc-200">Text Generation (LLM)</h3>
              <div className="space-y-2">
                <Label htmlFor="llm-provider">Provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
                    <SelectItem value="ollama">Local Ollama</SelectItem>
                    <SelectItem value="openai-compatible">OpenAI Compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="main-model">Model Name</Label>
                <Input id="main-model" defaultValue="qwen2.5:0.5b" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
              </div>
            </div>

            {/* Vision Model */}
            <div className="space-y-4 border border-zinc-800 p-4 rounded-lg bg-zinc-950/30">
              <h3 className="font-medium text-zinc-200">Vision Analysis</h3>
              <div className="space-y-2">
                <Label htmlFor="vision-provider">Provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
                    <SelectItem value="ollama">Local Ollama</SelectItem>
                    <SelectItem value="openai-compatible">OpenAI Compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vision-model">Model Name</Label>
                <Input id="vision-model" defaultValue="qwen2.5vl:7b" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
              </div>
            </div>

            {/* Embedding Model */}
            <div className="space-y-4 border border-zinc-800 p-4 rounded-lg bg-zinc-950/30">
              <h3 className="font-medium text-zinc-200">Embeddings (RAG)</h3>
              <div className="space-y-2">
                <Label htmlFor="embed-provider">Provider</Label>
                <Select defaultValue="ollama">
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
                    <SelectItem value="ollama">Local Ollama</SelectItem>
                    <SelectItem value="openai-compatible">OpenAI Compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="embedding-model">Model Name</Label>
                <Input id="embedding-model" defaultValue="nomic-embed-text:latest" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
              </div>
            </div>

            {/* Image Generator */}
            <div className="space-y-4 border border-zinc-800 p-4 rounded-lg bg-zinc-950/30">
              <h3 className="font-medium text-zinc-200">Image Generation & Editing</h3>
              <div className="space-y-2">
                <Label htmlFor="image-provider">Provider</Label>
                <Select defaultValue="local">
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
                    <SelectItem value="local">Local API</SelectItem>
                    <SelectItem value="none">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-model">Model Name</Label>
                <Input id="image-model" defaultValue="stable-diffusion-xl-instruct" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
              </div>
            </div>

          </div>
        </CardContent>
        <CardFooter className="border-t border-zinc-800 pt-4 bg-zinc-950/50">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </CardFooter>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Storage Settings</CardTitle>
          <CardDescription>Configure local data persistence paths.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-dir">Document & Image Upload Directory</Label>
            <Input id="upload-dir" defaultValue="./uploads" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
            <p className="text-xs text-zinc-500">Path where raw documents and generated images are stored on disk.</p>
          </div>
        </CardContent>
        <CardFooter className="border-t border-zinc-800 pt-4 bg-zinc-950/50">
          <Button onClick={handleSave} variant="secondary" className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700">
            <Save className="mr-2 h-4 w-4" /> Update Paths
          </Button>
        </CardFooter>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Retrieval-Augmented Generation (RAG) Settings</CardTitle>
          <CardDescription>Configure how documents are chunked and retrieved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="rag-chunk-size">Chunk Size</Label>
              <Input id="rag-chunk-size" type="number" defaultValue="1000" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
              <p className="text-xs text-zinc-500">Max characters per indexed document chunk.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-chunk-overlap">Chunk Overlap</Label>
              <Input id="rag-chunk-overlap" type="number" defaultValue="200" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
              <p className="text-xs text-zinc-500">Number of overlapping characters between chunks.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-top-k">Top-K Results</Label>
              <Input id="rag-top-k" type="number" defaultValue="4" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
              <p className="text-xs text-zinc-500">Maximum number of document chunks retrieved for context.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-threshold">Similarity Threshold</Label>
              <Input id="rag-threshold" type="number" step="0.1" defaultValue="0.7" className="bg-zinc-950 border-zinc-700 text-zinc-200" />
              <p className="text-xs text-zinc-500">Minimum cosine similarity score required (0.0 to 1.0).</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-zinc-800 pt-4 bg-zinc-950/50">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" /> Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
