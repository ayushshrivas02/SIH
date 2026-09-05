'use client';

import { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadCloud, FileText, CheckCircle2, Loader2, AlertTriangle, FileBox, Copy, ServerCrash, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

type PipelineState = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'complete' | 'error';

export default function ReportAnalyzerPage() {
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle');
  const [fileInfo, setFileInfo] = useState<{name: string, size: number, type: string} | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processFile = async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.txt') && !file.name.endsWith('.docx')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload PDF, TXT, or DOCX files only.",
        variant: "destructive"
      });
      return;
    }

    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type
    });
    setErrorMessage('');
    setExtractedText('');
    setReport('');
    
    // Begin Pipeline
    setPipelineState('uploading');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate extraction phase change purely for UI since fetch happens next
      setTimeout(() => setPipelineState('extracting'), 500);
      setTimeout(() => setPipelineState('analyzing'), 1500);
      
      const response = await fetch('http://localhost:8000/api/analyze-report', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setExtractedText(data.extracted_text || 'No text could be extracted from this document.');
      setReport(data.report || 'No analysis report generated.');
      setPipelineState('complete');
      
    } catch (error: any) {
      console.error("Analysis Failed:", error);
      setPipelineState('error');
      setErrorMessage(error.message || 'Failed to connect to the local inference server (localhost:8000). Ensure the backend is running.');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    toast({
      title: "Copied to Clipboard",
      description: "Analysis report has been copied successfully.",
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header & Pipeline State */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground">Report Analyzer</h1>
          <p className="text-sm text-muted-foreground">Extract and analyze confidential documents via local LLM</p>
        </div>
        
        {/* Pipeline Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto">
          <Badge variant={pipelineState === 'idle' ? 'default' : 'outline'} className={`whitespace-nowrap transition-colors ${pipelineState === 'idle' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border-border/50'}`}>
             1. Idle
          </Badge>
          <div className="w-4 h-[1px] bg-border shrink-0"></div>
          
          <Badge variant={pipelineState === 'uploading' ? 'default' : 'outline'} className={`whitespace-nowrap transition-colors ${pipelineState === 'uploading' ? 'bg-blue-600 text-white border-blue-600' : 'text-muted-foreground border-border/50'}`}>
             {pipelineState === 'uploading' && <Loader2 className="w-3 h-3 mr-1.5 animate-spin inline" />}
             2. Uploading
          </Badge>
          <div className="w-4 h-[1px] bg-border shrink-0"></div>
          
          <Badge variant={pipelineState === 'extracting' ? 'default' : 'outline'} className={`whitespace-nowrap transition-colors ${pipelineState === 'extracting' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-muted-foreground border-border/50'}`}>
             {pipelineState === 'extracting' && <Loader2 className="w-3 h-3 mr-1.5 animate-spin inline" />}
             3. Extracting Text
          </Badge>
          <div className="w-4 h-[1px] bg-border shrink-0"></div>
          
          <Badge variant={pipelineState === 'analyzing' ? 'default' : 'outline'} className={`whitespace-nowrap transition-colors ${pipelineState === 'analyzing' ? 'bg-amber-600 text-white border-amber-600' : 'text-muted-foreground border-border/50'}`}>
             {pipelineState === 'analyzing' && <Cpu className="w-3 h-3 mr-1.5 animate-pulse inline" />}
             4. Running Local LLM
          </Badge>
          <div className="w-4 h-[1px] bg-border shrink-0"></div>
          
          <Badge variant={pipelineState === 'complete' ? 'default' : 'outline'} className={`whitespace-nowrap transition-colors ${pipelineState === 'complete' ? 'bg-emerald-600 text-white border-emerald-600' : 'text-muted-foreground border-border/50'}`}>
             {pipelineState === 'complete' && <CheckCircle2 className="w-3 h-3 mr-1.5 inline" />}
             5. Complete
          </Badge>
        </div>
      </div>

      {pipelineState === 'error' && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
          <ServerCrash className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Connection Error</h3>
            <p className="text-sm opacity-90">{errorMessage}</p>
            <Button variant="outline" size="sm" onClick={() => setPipelineState('idle')} className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/20 bg-background/50">
              Reset Analyzer
            </Button>
          </div>
        </div>
      )}

      {/* Main Split Screen */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* Left Panel: Upload & Preview */}
        <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card shadow-sm rounded-xl">
          <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <h2 className="font-semibold flex items-center gap-2 text-foreground">
              <FileBox className="w-4 h-4 text-primary" /> Document Source
            </h2>
          </div>
          
          <div className="flex-1 relative flex flex-col min-h-0">
            {pipelineState === 'idle' || pipelineState === 'error' ? (
              <div 
                className={`flex-1 m-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${isDragOver ? 'border-primary bg-primary/10' : 'border-border/60 hover:border-primary/50 bg-background/30'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={`p-4 rounded-full mb-4 transition-colors ${isDragOver ? 'bg-primary/20' : 'bg-muted'}`}>
                  <UploadCloud className={`w-8 h-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Drag & Drop Report</h3>
                <p className="text-sm text-muted-foreground mb-6">Supports PDF, TXT, DOCX</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                />
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="shadow-sm">
                  Browse Files
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 p-4">
                {fileInfo && (
                  <div className="mb-4 flex items-center justify-between bg-background border border-border/60 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-md shadow-sm">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-foreground truncate">{fileInfo.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(fileInfo.size)}</p>
                      </div>
                    </div>
                    {pipelineState === 'complete' && (
                      <Button variant="ghost" size="sm" onClick={() => setPipelineState('idle')} className="text-xs hover:bg-muted">
                        Upload New
                      </Button>
                    )}
                  </div>
                )}
                
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Extracted Text Preview</h3>
                <ScrollArea className="flex-1 bg-background border border-border/60 rounded-lg p-4 shadow-inner">
                  {['uploading', 'extracting'].includes(pipelineState) ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Processing document securely...</p>
                    </div>
                  ) : extractedText ? (
                    <div className="text-sm whitespace-pre-wrap font-mono text-muted-foreground/80 leading-relaxed">
                      {extractedText}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mb-2 opacity-50 text-amber-500" />
                      <p className="text-sm">No text available.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </Card>

        {/* Right Panel: AI Analysis Report */}
        <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card shadow-sm rounded-xl">
          <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2 text-foreground">
              <Bot className="w-4 h-4 text-emerald-500" /> Formatted Analysis
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              disabled={pipelineState !== 'complete' || !report}
              className="h-8 bg-background border-border shadow-sm hover:bg-muted"
            >
              <Copy className="w-3.5 h-3.5 mr-2" /> Copy Analysis
            </Button>
          </div>
          
          <ScrollArea className="flex-1 bg-background m-4 border border-border/60 rounded-lg p-6 shadow-inner">
             {pipelineState === 'analyzing' ? (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full animate-spin border-t-emerald-500 shadow-sm"></div>
                    <Cpu className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-foreground mb-1 text-lg">Generating Intelligence Report</h3>
                    <p className="text-sm text-muted-foreground">Inferencing via local sovereign model...</p>
                  </div>
                </div>
             ) : pipelineState === 'complete' && report ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-a:text-primary prose-strong:text-emerald-400">
                  <ReactMarkdown>{report}</ReactMarkdown>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 shadow-inner border border-border/50">
                     <FileText className="w-6 h-6 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">Awaiting document upload for analysis.</p>
                </div>
             )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
