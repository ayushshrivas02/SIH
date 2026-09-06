'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Bot, User, Send, Paperclip, Server, AlertCircle, RefreshCw, Download, MessageSquare, Trash2, UploadCloud, BrainCircuit, Loader2, StopCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { useAssistantStore, Message } from '@/lib/store/appStore';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AgentWorkspacePanel from '@/components/agent/AgentWorkspacePanel';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { StatusBadge } from '@/components/ui/status-badge';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useRouter } from 'next/navigation';

export default function AssistantPage() {
  const { messages, setMessages, addMessage, updateMessage, clearMessages, conversationId, setConversationId, activeTaskId, setActiveTaskId } = useAssistantStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<{name: string}[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();

  // Used to track expanded states of citations per message ID
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  const toggleCitations = (msgId: string) => {
    setExpandedCitations(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchConversations();
    
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setModels(data.models);
        }
      })
      .catch(err => console.error('Failed to fetch models:', err));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.assistant_active_model) {
          setSelectedModel(data.settings.assistant_active_model);
        } else if (data.settings?.default_chat_model) {
          setSelectedModel(data.settings.default_chat_model);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModelChange = (val: string | null) => {
    if (!val) return;
    setSelectedModel(val);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'assistant_active_model', value: val })
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMounted, activeTaskId, isLoading]);

  const handleClearChat = () => {
    if (isLoading) handleStopGeneration();
    clearMessages();
    setActiveTaskId(null);
  };

  const loadConversation = async (id: string) => {
    if (isLoading) handleStopGeneration();
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.id);
        setMessages(data.messages);
      }
    } catch (e) {
      console.error('Failed to load conversation', e);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (conversationId === id) {
        clearMessages();
      }
      fetchConversations();
    } catch (e) {
      console.error('Failed to delete conversation', e);
    }
  };

  const deleteAllConversations = async () => {
    if (!confirm('Are you sure you want to delete all chat history?')) return;
    try {
      await fetch('/api/conversations', { method: 'DELETE' });
      clearMessages();
      fetchConversations();
      toast({ title: 'History Cleared', description: 'All saved conversations have been deleted.' });
    } catch (e) {
      console.error('Failed to clear history', e);
      toast({ title: 'Error', description: 'Failed to clear history.', variant: 'destructive' });
    }
  };

  const exportToPDF = async () => {
    if (!chatContainerRef.current || messages.length === 0) return;
    
    try {
      const canvas = await html2canvas(chatContainerRef.current, {
        scale: 2,
        backgroundColor: '#09090b', // zinc-950 or base background color
        windowWidth: 1200
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`chat-export-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Export Successful",
        description: "Chat history downloaded as PDF.",
      });
    } catch (error) {
      console.error("PDF Export failed", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF.",
        variant: "destructive"
      });
    }
  };

  const saveMessageToDB = async (msg: Message, currentId: string | null, isInitialSync = false, msgs: Message[] = []) => {
    try {
      if (!currentId) {
        // Create new conversation
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: msg.content.substring(0, 40) + '...',
            initialMessages: isInitialSync ? msgs : [msg]
          })
        });
        if (res.ok) {
          const data = await res.json();
          setConversationId(data.id);
          fetchConversations();
          return data.id;
        }
      } else {
        // Append to existing
        if (!isInitialSync) {
            await fetch(`/api/conversations/${currentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
        }
        return currentId;
      }
    } catch (e) {
      console.error("Failed to sync message to DB", e);
    }
    return null;
  };

  // Drag and Drop Handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      toast({ title: 'Uploading Document...', description: `Processing ${file.name}` });

      try {
        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          toast({
            title: 'Document Uploaded',
            description: `${file.name} successfully uploaded and processing for knowledge base.`,
          });
          setInput((prev) => prev + `[Uploaded Document: ${file.name}] `);
        } else {
          toast({
            title: 'Upload Failed',
            description: await res.text(),
            variant: 'destructive',
          });
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred during upload.',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);
    
    // Set up AbortController for stream cancellation
    abortControllerRef.current = new AbortController();

    let activeConversationId = conversationId;
    if (!activeConversationId && messages.length === 0) {
      activeConversationId = await saveMessageToDB(userMessage, null);
    } else {
      await saveMessageToDB(userMessage, activeConversationId);
    }

    if (agentMode) {
      // Run as Agent Workflow
      try {
        const res = await fetch('/api/agents/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: 'custom-agent', input: text, model: selectedModel === 'auto' ? undefined : selectedModel }),
          signal: abortControllerRef.current.signal
        });

        if (res.ok) {
          const data = await res.json();
          setActiveTaskId(data.taskId);
          
          const assistantMsg: Message = { 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: `I have started an autonomous agent workflow for your request. You can monitor its progress in the right panel. Task ID: ${data.taskId}`,
            providerInfo: 'Agent Orchestrator'
          };
          addMessage(assistantMsg);
          if (activeConversationId) await saveMessageToDB(assistantMsg, activeConversationId);
          
        } else {
          throw new Error('Failed to start agent workflow');
        }
      } catch (error: any) {
         if (error.name === 'AbortError') {
           console.log('Agent request aborted');
         } else {
           addMessage({ 
              id: crypto.randomUUID(), 
              role: 'assistant', 
              content: `Failed to start agent: ${error.message}`,
              isError: true
            });
         }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
      return;
    }

    // Standard Chat Workflow
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        model: selectedModel || undefined
      }),
      signal: abortControllerRef.current.signal
    })
      .then(async (response) => {
        if (!response.ok) {
           const data = await response.json().catch(() => ({}));
           throw new Error(data.error || 'Unable to get a response from the AI model.');
        }
        
        const providerHeader = response.headers.get('X-Provider');
        const modelHeader = response.headers.get('X-Model');
        const providerInfo = providerHeader && modelHeader ? `via ${providerHeader} (${modelHeader})` : undefined;
        
        // Parse RAG Sources
        const ragSourcesHeader = response.headers.get('X-RAG-Sources');
        let ragSources = [];
        try {
            if (ragSourcesHeader) {
                ragSources = JSON.parse(decodeURIComponent(ragSourcesHeader)) as { documentName: string; pageNumber: number; section: string; score: number }[];
            }
        } catch (e) {
            console.error("Failed to parse RAG sources", e);
        }
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        const assistantMsgId = crypto.randomUUID();
        
        addMessage({ 
          id: assistantMsgId, 
          role: 'assistant', 
          content: '',
          providerInfo,
        });

        let done = false;
        let accumulatedContent = '';
        let lastUpdateTime = Date.now();
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;
            
            if (Date.now() - lastUpdateTime > 50 || done) {
              lastUpdateTime = Date.now();
              updateMessage(assistantMsgId, accumulatedContent);
            }
          }
        }
        
        updateMessage(assistantMsgId, accumulatedContent);
        
        // Format RAG sources cleanly using HTML/Markdown rather than raw text
        if (ragSources.length > 0) {
          const sourcesText = `\n\n<br/>\n\n**📚 Retrieved Knowledge Sources**\n` + 
            ragSources.map((source) => `- **${source.documentName}** (Page ${source.pageNumber}) — Relevance: ${(source.score * 100).toFixed(1)}%`).join('\n');
          accumulatedContent += sourcesText;
          updateMessage(assistantMsgId, accumulatedContent);
        }

        const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: accumulatedContent, providerInfo };
        if (activeConversationId) {
            await saveMessageToDB(assistantMsg, activeConversationId);
        }
      })
      .catch((error: Error) => {
        if (error.name === 'AbortError') {
          console.log('Stream aborted by user');
        } else {
          addMessage({ 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: `${error.message}`,
            isError: true
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
        abortControllerRef.current = null;
      });
  };

  if (!isMounted) return null; // Avoid hydration mismatch
  
  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-30 z-0 pointer-events-none" />
      
      {/* Sidebar for History */}
      <Card className="w-64 flex-shrink-0 flex flex-col overflow-hidden shadow-2xl hidden lg:flex rounded-xl bg-card/60 backdrop-blur-xl border border-white/5 relative z-10">
        <div className="p-4 border-b border-white/5 flex gap-2">
            <Button onClick={handleClearChat} variant="secondary" className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20">
                <RefreshCw className="h-4 w-4 mr-2" /> New Session
            </Button>
            <Button onClick={deleteAllConversations} variant="outline" title="Delete all history" className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 px-3 transition-colors">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
        <ScrollArea className="flex-1 p-2 min-h-0 bg-transparent">
            <div className="space-y-1">
                {conversations.length === 0 && (
                    <div className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground mt-6 px-4">
                        No recent history
                    </div>
                )}
                {conversations.map((conv) => (
                    <div 
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all group ${conversationId === conv.id ? 'bg-primary/10 text-primary border border-primary/30 shadow-[inset_0_0_15px_rgba(var(--primary),0.1)]' : 'hover:bg-white/5 text-white/70 hover:text-white border border-transparent'}`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <MessageSquare className={`h-4 w-4 shrink-0 ${conversationId === conv.id ? 'text-primary' : 'text-muted-foreground group-hover:text-white'}`} />
                            <span className="text-sm truncate font-medium">{conv.title}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={(e) => deleteConversation(conv.id, e)} className="h-6 w-6 text-muted-foreground hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all rounded-xl border relative z-10 shadow-2xl ${isDragOver ? 'border-primary bg-primary/10' : 'border-white/5 bg-card/60 backdrop-blur-xl'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
          <div className="flex items-center justify-between p-4 shrink-0 border-b border-white/5 bg-black/20 rounded-t-xl z-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase flex items-center gap-2 font-heading">
                 AI Workbench
                 <Badge variant="outline" className="ml-2 font-bold text-[10px] tracking-widest bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hidden sm:inline-flex uppercase">Secure Channel</Badge>
              </h1>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/70 mt-1 hidden sm:block">Interact with local models and sovereign data.</p>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg px-4 py-2 shadow-inner transition-colors hover:border-primary/50">
                <button
                  id="agent-mode"
                  type="button"
                  role="switch"
                  aria-checked={agentMode}
                  onClick={() => setAgentMode(!agentMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${agentMode ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-muted-foreground/30'}`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${agentMode ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
                <Label htmlFor="agent-mode" onClick={() => setAgentMode(!agentMode)} className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer text-white/90">
                  <BrainCircuit className={`h-4 w-4 ${agentMode ? 'text-primary' : 'text-muted-foreground'}`} /> Agent Mode
                </Label>
              </div>
              
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={messages.length === 0} className="bg-black/40 border-white/10 hover:bg-white/10 hover:text-white transition-colors">
                  <Download className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline font-bold uppercase tracking-widest text-xs">Export</span>
                </Button>
                <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-3 py-1 shadow-inner hover:border-primary/50 transition-colors">
                  <Server className="h-4 w-4 text-primary mx-2" />
                  <Select value={selectedModel} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-[180px] h-8 border-none bg-transparent focus:ring-0 text-sm font-semibold text-white">
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                      <SelectItem value="auto" className="font-bold text-primary tracking-wide">🌟 Orchestrator</SelectItem>
                      {models.length === 0 ? (
                        <SelectItem value="default">Default Model</SelectItem>
                      ) : (
                        models.map(m => (
                          <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className={`flex-1 flex flex-col overflow-hidden min-h-0 relative`}>
            {isDragOver && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md rounded-b-xl border-2 border-primary border-dashed m-2">
                <div className="p-4 bg-primary/10 rounded-full mb-4 animate-bounce">
                  <UploadCloud className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Drop files to upload</h2>
                <p className="text-muted-foreground">Documents will be securely indexed into the Knowledge Base.</p>
              </div>
            )}
            
            <ScrollArea className="flex-1 min-h-0 relative">
              <div ref={chatContainerRef} className="p-4 sm:p-6 space-y-8 max-w-4xl mx-auto w-full">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4 animate-in fade-in zoom-in duration-700">
                    <div className="p-6 bg-black/40 border border-primary/30 rounded-full mb-6 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                       <Bot className="h-12 w-12 text-primary" />
                    </div>
                    <h2 className="text-3xl font-black uppercase font-heading tracking-tighter text-white mb-3">System Ready</h2>
                    <p className="max-w-md text-sm font-medium text-muted-foreground mb-8">
                      Your secure, private AI environment is online. Analyze sensitive documents, query local models, and run autonomous agents safely.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
                      <div className="bg-black/40 hover:bg-black/60 p-5 rounded-xl border border-white/5 hover:border-primary/50 transition-all shadow-lg group">
                        <MessageSquare className="h-6 w-6 mb-3 text-primary drop-shadow-md group-hover:scale-110 transition-transform" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 mb-1">Chat Safely</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Have conversations completely offline using locally hosted LLMs.</p>
                      </div>
                      <div className="bg-black/40 hover:bg-black/60 p-5 rounded-xl border border-white/5 hover:border-cyan-500/50 transition-all shadow-lg group">
                        <UploadCloud className="h-6 w-6 mb-3 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] group-hover:scale-110 transition-transform" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 mb-1">Analyze Documents</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Drag and drop PDFs to add them to your secure Knowledge Base.</p>
                      </div>
                      <div className="bg-black/40 hover:bg-black/60 p-5 rounded-xl border border-white/5 hover:border-emerald-500/50 transition-all shadow-lg group">
                        <BrainCircuit className="h-6 w-6 mb-3 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] group-hover:scale-110 transition-transform" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 mb-1">Run Agents</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Enable Agent Mode for autonomous, multi-step problem solving.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 group ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    {message.role === 'assistant' && (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${message.isError ? 'bg-rose-950/50 border border-rose-500/30 text-rose-400' : 'bg-black/60 border border-primary/30 text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]'}`}>
                        {message.isError ? <AlertCircle className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                      </div>
                    )}
                    
                    <div
                      className={`px-6 py-4 rounded-2xl max-w-[85%] sm:max-w-[75%] flex flex-col gap-2 shadow-xl ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-[0_0_15px_rgba(var(--primary),0.3)] border border-primary-foreground/10'
                          : message.isError
                          ? 'bg-rose-950/30 border border-rose-500/30 text-rose-400 rounded-tl-sm'
                          : 'bg-black/60 backdrop-blur-md border border-white/10 text-white rounded-tl-sm'
                      }`}
                    >
                      <div className={`prose prose-sm max-w-none leading-relaxed overflow-x-auto ${message.role === 'user' ? 'text-primary-foreground dark:prose-invert prose-p:text-primary-foreground prose-a:text-primary-foreground' : 'text-white/90 dark:prose-invert'}`}>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.providerInfo && (
                        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-1.5">
                            <Server className="h-3 w-3" /> {message.providerInfo}
                          </span>
                        </div>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center shrink-0 shadow-lg border border-white/10">
                        <User className="h-5 w-5 text-white/70" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                  <div className="flex gap-4 justify-start animate-in fade-in duration-300">
                    <div className="w-10 h-10 rounded-full bg-black/60 border border-primary/30 flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    </div>
                    <div className="px-6 py-4 rounded-2xl rounded-tl-sm bg-black/60 backdrop-blur-md border border-white/10 flex items-center space-x-2 shadow-xl">
                       <span className="text-xs font-bold uppercase tracking-widest text-primary/70 mr-2">Processing</span>
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulseGlow shadow-[0_0_8px_rgba(var(--primary),0.8)]"></div>
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulseGlow shadow-[0_0_8px_rgba(var(--primary),0.8)]" style={{ animationDelay: '0.15s' }}></div>
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulseGlow shadow-[0_0_8px_rgba(var(--primary),0.8)]" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} className="h-4" />
              </div>
            </ScrollArea>

            <div className="p-4 bg-card/60 backdrop-blur-xl border-t border-white/5 mt-auto rounded-b-xl z-10">
              <div className="max-w-4xl mx-auto relative">
                {isLoading && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleStopGeneration}
                      className="rounded-full bg-black/80 backdrop-blur-xl border-rose-500/30 text-rose-400 shadow-xl shadow-rose-500/10 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-500/50 transition-all animate-in fade-in slide-in-from-bottom-4"
                    >
                      <StopCircle className="h-4 w-4 mr-2" /> Stop Processing
                    </Button>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex gap-3 items-end relative">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    title="Attach Document"
                    className="shrink-0 rounded-xl h-14 w-14 relative overflow-hidden group border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/20 transition-all shadow-inner"
                  >
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const evt = { dataTransfer: { files: e.target.files }, preventDefault: () => {} } as any;
                          handleDrop(evt);
                        }
                      }}
                    />
                    <Paperclip className="h-5 w-5 text-white/50 group-hover:text-cyan-400 transition-colors relative z-0" />
                  </Button>
                  
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={agentMode ? "Describe the complex mission for the autonomous agent..." : "Query the secure intelligence matrix..."}
                      className="w-full bg-black/40 border-white/10 text-white rounded-xl px-5 py-4 h-14 shadow-inner focus-visible:ring-primary focus-visible:border-primary pr-14 text-base placeholder:text-white/30"
                    />
                  </div>
                  
                  <ShimmerButton 
                    type="submit" 
                    disabled={isLoading || !input.trim()} 
                    className={`shrink-0 rounded-xl h-14 px-8 transition-all shadow-xl font-bold uppercase tracking-widest text-xs ${agentMode ? 'bg-emerald-600' : 'bg-primary'}`}
                  >
                    {agentMode ? (
                       <><BrainCircuit className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Initialize</span></>
                    ) : (
                       <><Send className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Execute</span></>
                    )}
                  </ShimmerButton>
                </form>
                <div className="text-center mt-3">
                   <p className="text-[10px] font-bold tracking-widest uppercase text-white/30">Intelligence generated locally. Zero-trust environment.</p>
                </div>
              </div>
            </div>
          </div>
      </div>
      
      {/* Right Panel for Agent Workspace */}
      <AgentWorkspacePanel />
    </div>
  );
}
