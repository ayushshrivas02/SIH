'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Image as ImageIcon, Sparkles, Wand2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVisionStore } from '@/lib/store/appStore';

export default function VisionPage() {
  const {
    imagePreview, setImagePreview,
    imageBase64, setImageBase64,
    analyzePrompt, setAnalyzePrompt,
    analyzeResult, setAnalyzeResult,
    analyzing, setAnalyzing,
    editPrompt, setEditPrompt,
    editResult, setEditResult,
    editing, setEditing,
    clearVisionState
  } = useVisionStore();

  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setImagePreview(resizedBase64);
          setImageBase64(resizedBase64);
        } else {
          // Fallback if canvas context is not available
          setImagePreview(base64);
          setImageBase64(base64);
        }
        setAnalyzeResult(null); 
        setEditResult(null);
      };
      img.src = base64;
    };
    
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    
    setAnalyzing(true);
    setAnalyzeResult(null);

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, prompt: analyzePrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalyzeResult(data.result);
        toast({
          title: 'Analysis Complete',
          description: 'Vision model has completed the inspection.',
        });
      } else {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error || await res.text() || 'Failed to analyze image.';
        toast({
          title: 'Analysis Failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Connection Error',
        description: 'Ensure local AI provider is configured and running.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEdit = async () => {
    if (!imageBase64) return;
    
    setEditing(true);
    setEditResult(null);

    try {
      const res = await fetch('/api/vision/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, prompt: editPrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        setEditResult(data.result);
        toast({
          title: 'Editing Complete',
          description: 'Image has been successfully edited.',
        });
      } else {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error || await res.text() || 'Failed to edit image.';
        toast({
          title: 'Edit Failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Connection Error',
        description: 'Ensure local image provider is configured and running.',
        variant: 'destructive',
      });
    } finally {
      setEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vision Inspection & Editing</h1>
          <p className="text-zinc-400">Analyze or enhance industrial imagery securely on-premise.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-400" />
              Upload Image
            </CardTitle>
            <CardDescription>Select a photo of equipment, machinery, or parts.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {!imagePreview ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-lg p-12 hover:border-zinc-500 transition-colors bg-zinc-950/50">
                <ImageIcon className="h-12 w-12 text-zinc-600 mb-4" />
                <p className="text-sm text-zinc-400 mb-4 text-center">Drag and drop an image, or click to browse.</p>
                <div className="relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <Button variant="secondary" className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700">Browse Files</Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4">
                <div className="relative rounded-lg overflow-hidden border border-zinc-700 bg-black/50 aspect-video flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                </div>
                <Button variant="outline" onClick={clearVisionState} className="bg-transparent border-zinc-700 hover:bg-zinc-800 self-start">
                  Remove Image
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 flex flex-col">
          <Tabs defaultValue="analyze" className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <TabsList className="bg-zinc-950/50 border border-zinc-800 w-full justify-start">
                <TabsTrigger value="analyze" className="data-[state=active]:bg-zinc-800">
                  <Sparkles className="h-4 w-4 mr-2" /> Analyze Image
                </TabsTrigger>
                <TabsTrigger value="edit" className="data-[state=active]:bg-zinc-800">
                  <Wand2 className="h-4 w-4 mr-2" /> Edit Image
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-4">
              
              <TabsContent value="analyze" className="flex-1 flex flex-col gap-4 m-0 data-[state=inactive]:hidden">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Analysis Prompt</label>
                  <Textarea 
                    value={analyzePrompt}
                    onChange={(e) => setAnalyzePrompt(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-zinc-200 resize-none h-24"
                    placeholder="What should the vision model look for?"
                  />
                </div>
                
                <Button 
                  onClick={handleAnalyze} 
                  disabled={!imagePreview || analyzing} 
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  {analyzing ? 'Analyzing Image...' : 'Run Vision Analysis'}
                </Button>

                <div className="flex-1 mt-4 flex flex-col">
                  <label className="text-sm font-medium text-zinc-300 block mb-2">Findings</label>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex-1 min-h-[12rem] overflow-y-auto">
                    {analyzing ? (
                      <div className="flex items-center justify-center h-full text-zinc-500 space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    ) : analyzeResult ? (
                      <div className="text-sm text-zinc-200 whitespace-pre-wrap">{analyzeResult}</div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-600 italic">
                        Awaiting image analysis...
                      </div>
                    )}
                  </div>
                </div>
                {analyzeResult && (
                   <div className="mt-2 text-xs text-yellow-500 border border-yellow-500/20 bg-yellow-500/10 p-3 rounded-md">
                     <strong>Disclaimer:</strong> AI-generated observations are decision-support outputs and must be verified by qualified personnel.
                   </div>
                )}
              </TabsContent>

              <TabsContent value="edit" className="flex-1 flex flex-col gap-4 m-0 data-[state=inactive]:hidden">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Edit Prompt</label>
                  <Textarea 
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-zinc-200 resize-none h-24"
                    placeholder="Describe how to edit the image (e.g. 'Remove background', 'Improve lighting')."
                  />
                </div>
                
                <Button 
                  onClick={handleEdit} 
                  disabled={!imagePreview || editing} 
                  className="bg-purple-600 hover:bg-purple-700 w-full"
                >
                  {editing ? 'Generating Image...' : 'Generate Edited Image'}
                </Button>

                <div className="flex-1 mt-4 flex flex-col">
                  <label className="text-sm font-medium text-zinc-300 block mb-2">Edited Result</label>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg flex-1 min-h-[12rem] flex items-center justify-center overflow-hidden">
                    {editing ? (
                      <div className="flex items-center justify-center h-full text-zinc-500 space-x-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    ) : editResult ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={editResult} alt="Edited Result" className="max-w-full max-h-full object-contain rounded-md" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-600 italic">
                        Awaiting image editing...
                      </div>
                    )}
                  </div>
                  {editResult && (
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" className="flex-1 border-zinc-700 bg-zinc-900" onClick={() => {
                        const link = document.createElement('a');
                        link.href = editResult;
                        link.download = 'edited-image.png';
                        link.click();
                      }}>
                        <Download className="mr-2 h-4 w-4" /> Save
                      </Button>
                      <Button variant="secondary" className="flex-1 bg-zinc-800">Add to Report</Button>
                    </div>
                  )}
                </div>
                {editResult && (
                   <div className="mt-2 text-xs text-yellow-500 border border-yellow-500/20 bg-yellow-500/10 p-3 rounded-md">
                     <strong>Important:</strong> AI-generated visualization — not an engineering measurement or verified physical representation.
                   </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
