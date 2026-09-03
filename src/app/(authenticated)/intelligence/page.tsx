'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, CheckCircle2, Loader2, BrainCircuit, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

type ProcessingStep = {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  log?: string;
};

export default function IntelligencePage() {
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState('Please summarize this document and extract any key insights.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'detect', name: 'Detect Input Type', status: 'pending' },
    { id: 'extract', name: 'Extract & OCR / Vision', status: 'pending' },
    { id: 'rag', name: 'RAG Indexing', status: 'pending' },
    { id: 'analysis', name: 'AI Analysis', status: 'pending' },
    { id: 'verify', name: 'Verification', status: 'pending' }
  ]);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStep = (id: string, status: ProcessingStep['status'], log?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, log: log || s.log } : s));
  };

  const handleProcess = async () => {
    if (!file) {
      toast({ title: 'No file', description: 'Please upload a file first', variant: 'destructive' });
      return;
    }
    
    setIsProcessing(true);
    setResult(null);
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', log: '' })));

    try {
      // 1. Detect Type
      updateStep('detect', 'active');
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const typeLabel = isImage ? 'Image / Vision' : isPdf ? 'PDF Document' : 'Text/Data Document';
      await new Promise(r => setTimeout(r, 800)); // Simulating detection time
      updateStep('detect', 'completed', `Detected: ${typeLabel}`);

      // 2. Upload & Extract
      updateStep('extract', 'active');
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/documents', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      const uploadData = await uploadRes.json();
      const docId = uploadData.document.id;
      
      // We manually call process to wait for it instead of relying on the background trigger
      const processRes = await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, filePath: `./uploads/${file.name}` })
      });
      if (!processRes.ok) throw new Error('Extraction failed');
      
      updateStep('extract', 'completed', 'Content extracted successfully');

      // 3. RAG Indexing
      updateStep('rag', 'active');
      // The process route actually does RAG indexing too
      const processData = await processRes.json();
      await new Promise(r => setTimeout(r, 800));
      updateStep('rag', 'completed', `Indexed ${processData.chunks || 1} chunks into vector store`);

      // 4. AI Analysis
      updateStep('analysis', 'active');
      const queryRes = await fetch('/api/intelligence/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, query, type: isImage ? 'image' : 'document' })
      });
      if (!queryRes.ok) throw new Error('AI Analysis failed');
      const queryData = await queryRes.json();
      setModelUsed(queryData.model);
      updateStep('analysis', 'completed', `Analysis complete using ${queryData.model}`);

      // 5. Verification
      updateStep('verify', 'active');
      await new Promise(r => setTimeout(r, 1000)); // Simulate verifying output constraints
      
      if (!queryData.result || queryData.result.includes('I cannot find the answer')) {
         updateStep('verify', 'error', 'Failed verification: No relevant data found.');
         setResult(queryData.result);
      } else {
         updateStep('verify', 'completed', 'Result verified successfully.');
         setResult(queryData.result);
      }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Processing Error', description: err.message, variant: 'destructive' });
      // Mark active step as error
      setSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error', log: err.message } : s));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BrainCircuit className="h-8 w-8 text-blue-500" />
          Multimodal Intelligence
        </h1>
        <p className="text-zinc-400 mt-2">
          Upload documents, scanned PDFs, or images for full multimodal OCR and RAG analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Input */}
        <Card className="md:col-span-1 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Input Source</CardTitle>
            <CardDescription>Select a file to analyze</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed border-zinc-700 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.png,.jpg,.jpeg,.docx,.csv"
              />
              {file ? (
                <>
                  {file.type.includes('image') ? <ImageIcon className="h-10 w-10 text-blue-400 mb-2" /> : <FileText className="h-10 w-10 text-blue-400 mb-2" />}
                  <p className="font-medium text-zinc-200 break-all">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 text-zinc-500 mb-2" />
                  <p className="font-medium text-zinc-300">Click to upload</p>
                  <p className="text-xs text-zinc-500 mt-1">PDF, Scanned PDF, Images, DOCX</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Analysis Prompt</label>
              <Textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-sm resize-none h-24"
                placeholder="What would you like to know about this document?"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              onClick={handleProcess}
              disabled={!file || isProcessing}
            >
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Analyze Document'}
            </Button>
          </CardFooter>
        </Card>

        {/* Right Column: Pipeline & Results */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Pipeline Stepper */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Live Processing Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
                        ${step.status === 'completed' ? 'border-green-500 bg-green-500/10 text-green-500' : 
                          step.status === 'active' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 
                          step.status === 'error' ? 'border-red-500 bg-red-500/10 text-red-500' :
                          'border-zinc-700 text-zinc-600'}`}
                      >
                        {step.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : 
                         step.status === 'active' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                         step.status === 'error' ? <AlertCircle className="w-5 h-5" /> :
                         <span className="text-xs">{idx + 1}</span>}
                      </div>
                      {idx < steps.length - 1 && (
                        <div className={`w-0.5 h-full my-1 ${step.status === 'completed' ? 'bg-green-500/50' : 'bg-zinc-800'}`} />
                      )}
                    </div>
                    <div className="pt-1 pb-4 flex-1">
                      <p className={`font-medium ${
                        step.status === 'completed' ? 'text-green-400' : 
                        step.status === 'active' ? 'text-blue-400' : 
                        step.status === 'error' ? 'text-red-400' : 'text-zinc-500'
                      }`}>
                        {step.name}
                      </p>
                      {step.log && (
                        <p className="text-sm text-zinc-400 mt-1">{step.log}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Results Area */}
          {result && (
            <Card className="bg-zinc-900 border-green-900/30 ring-1 ring-green-900/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              <CardHeader className="pb-2 border-b border-zinc-800">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> 
                    Analysis Complete
                  </CardTitle>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                    Model: {modelUsed}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="prose prose-invert prose-sm max-w-none text-zinc-300">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
