'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Image as ImageIcon, Sparkles, Wand2, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVisionStore } from '@/lib/store/appStore';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { MagicCard } from '@/components/ui/magic-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';

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
    <div className="space-y-8 relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-40" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg flex items-center gap-3">
             <Eye className="h-8 w-8 text-primary" /> Vision Cortex
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            Analyze or enhance industrial imagery securely through neural pipelines.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 relative z-10">
        <MagicCard gradientColor="hsl(var(--primary) / 0.15)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl flex flex-col min-h-[600px]">
          <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
            <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
              <Camera className="h-4 w-4 text-cyan-400" /> Image Input Feed
            </CardTitle>
            <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">Select visual telemetry for neural processing.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-6">
            {!imagePreview ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-12 hover:border-primary/50 transition-colors bg-black/40 shadow-inner group">
                <ImageIcon className="h-16 w-16 text-white/10 group-hover:text-primary/50 transition-colors mb-6" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6 text-center">Transmit visual data here</p>
                <div className="relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <Button variant="outline" className="bg-black/60 border-white/10 text-white hover:bg-white/5 font-bold uppercase tracking-widest text-xs h-10 px-8">Browse Matrices</Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4 h-full">
                <div className="relative rounded-xl overflow-hidden border border-white/5 bg-black/60 flex-1 flex items-center justify-center shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain p-2" />
                </div>
                <Button variant="outline" onClick={clearVisionState} className="bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 font-bold uppercase tracking-widest text-[10px] self-end">
                  Clear Feed
                </Button>
              </div>
            )}
          </CardContent>
        </MagicCard>

        <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl flex flex-col min-h-[600px]">
          <Tabs defaultValue="analyze" className="flex flex-col h-full">
            <CardHeader className="pb-0 border-b border-white/5 bg-black/20">
              <TabsList className="bg-transparent border-none w-full justify-start h-12 p-0 space-x-6">
                <TabsTrigger value="analyze" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 border-primary rounded-none h-full px-0 font-bold uppercase tracking-widest text-[10px] text-muted-foreground hover:text-white transition-colors">
                  <Sparkles className="h-3 w-3 mr-2" /> Neural Analysis
                </TabsTrigger>
                <TabsTrigger value="edit" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-purple-400 data-[state=active]:border-b-2 border-purple-400 rounded-none h-full px-0 font-bold uppercase tracking-widest text-[10px] text-muted-foreground hover:text-white transition-colors">
                  <Wand2 className="h-3 w-3 mr-2" /> Image Synthesis
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-6">
              
              <TabsContent value="analyze" className="flex-1 flex flex-col gap-6 m-0 data-[state=inactive]:hidden outline-none">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 block">Analysis Directives</label>
                  <Textarea 
                    value={analyzePrompt}
                    onChange={(e) => setAnalyzePrompt(e.target.value)}
                    className="bg-black/60 border-white/10 text-white font-mono text-xs resize-none h-24 rounded-xl shadow-inner focus-visible:ring-primary"
                    placeholder="Specify defect detection vectors or analytical queries..."
                  />
                </div>
                
                <ShimmerButton 
                  onClick={handleAnalyze} 
                  disabled={!imagePreview || analyzing} 
                  className="w-full h-12 font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 pointer-events-auto"
                >
                  {analyzing ? 'Processing Telemetry...' : 'Execute Neural Analysis'}
                </ShimmerButton>

                <div className="flex-1 flex flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 block mb-3">Model Output Matrix</label>
                  <div className="bg-black/60 border border-white/5 rounded-xl p-6 flex-1 min-h-[12rem] overflow-y-auto shadow-inner relative group">
                    {analyzing ? (
                      <div className="flex items-center justify-center h-full text-primary space-x-3">
                        <div className="w-1.5 h-6 bg-primary animate-pulse" />
                        <div className="w-1.5 h-8 bg-primary animate-pulse" style={{ animationDelay: '0.1s' }} />
                        <div className="w-1.5 h-4 bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="font-mono text-xs ml-4 uppercase tracking-widest">Inferencing...</span>
                      </div>
                    ) : analyzeResult ? (
                      <div className="text-xs text-white/90 font-mono leading-relaxed whitespace-pre-wrap">{analyzeResult}</div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/10 font-bold uppercase tracking-widest text-[10px]">
                        Awaiting Execution
                      </div>
                    )}
                  </div>
                </div>
                {analyzeResult && (
                   <div className="text-[10px] text-amber-500 border border-amber-500/20 bg-amber-500/10 p-3 rounded-lg font-mono tracking-wide">
                     <strong className="uppercase">Notice:</strong> AI-generated observations are decision-support outputs and must be verified.
                   </div>
                )}
              </TabsContent>

              <TabsContent value="edit" className="flex-1 flex flex-col gap-6 m-0 data-[state=inactive]:hidden outline-none">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-purple-400/70 block">Synthesis Parameters</label>
                  <Textarea 
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="bg-black/60 border-white/10 text-white font-mono text-xs resize-none h-24 rounded-xl shadow-inner focus-visible:ring-purple-400"
                    placeholder="Describe how to alter the visual matrix (e.g. 'Isolate main component', 'Enhance contrast')."
                  />
                </div>
                
                <ShimmerButton 
                  onClick={handleEdit} 
                  disabled={!imagePreview || editing} 
                  className="w-full h-12 font-bold uppercase tracking-widest text-xs shadow-xl shadow-purple-500/20 pointer-events-auto"
                  shimmerColor="hsl(var(--primary))"
                >
                  {editing ? 'Synthesizing...' : 'Initialize Generative Pipeline'}
                </ShimmerButton>

                <div className="flex-1 flex flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-purple-400/70 block mb-3">Synthesized Artifact</label>
                  <div className="bg-black/60 border border-white/5 rounded-xl flex-1 min-h-[12rem] flex items-center justify-center overflow-hidden shadow-inner p-2">
                    {editing ? (
                      <div className="flex items-center justify-center h-full text-purple-400 space-x-3">
                        <div className="w-1.5 h-6 bg-purple-400 animate-pulse" />
                        <div className="w-1.5 h-8 bg-purple-400 animate-pulse" style={{ animationDelay: '0.1s' }} />
                        <div className="w-1.5 h-4 bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="font-mono text-xs ml-4 uppercase tracking-widest">Rendering...</span>
                      </div>
                    ) : editResult ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={editResult} alt="Edited Result" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/10 font-bold uppercase tracking-widest text-[10px]">
                        Awaiting Synthesis
                      </div>
                    )}
                  </div>
                  {editResult && (
                    <div className="mt-4 flex gap-3">
                      <Button variant="outline" className="flex-1 bg-black/40 border-white/10 hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] text-white" onClick={() => {
                        const link = document.createElement('a');
                        link.href = editResult;
                        link.download = 'synthesized-artifact.png';
                        link.click();
                      }}>
                        <Download className="mr-2 h-3 w-3" /> Save To Disk
                      </Button>
                      <Button variant="outline" className="flex-1 bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 font-bold uppercase tracking-widest text-[10px]">
                        Attach To Dossier
                      </Button>
                    </div>
                  )}
                </div>
                {editResult && (
                   <div className="text-[10px] text-purple-400 border border-purple-500/20 bg-purple-500/10 p-3 rounded-lg font-mono tracking-wide">
                     <strong className="uppercase">Notice:</strong> AI-synthesized visualization — not a verified physical representation.
                   </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </MagicCard>
      </div>
    </div>
  );
}
