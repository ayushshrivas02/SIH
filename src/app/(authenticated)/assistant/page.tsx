'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Bot, User, Send, Paperclip, Server, AlertCircle, RefreshCw, Download, MessageSquare, Trash2, UploadCloud, BrainCircuit, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import ReactMarkdown from 'react-markdown';
import { useAssistantStore, Message } from '@/lib/store/appStore';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AgentWorkspacePanel from '@/components/agent/AgentWorkspacePanel';
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
  const { toast } = useToast();
  const router = useRouter();

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
  }, [messages, isMounted, activeTaskId]);

  const handleClearChat = () => {
    clearMessages();
    setActiveTaskId(null);
  };

  const loadConversation = async (id: string) => {
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
        backgroundColor: '#09090b', // zinc-950
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

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
         addMessage({ 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: `Failed to start agent: ${error.message}`,
            isError: true
          });
      } finally {
        setIsLoading(false);
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
    })
      .then(async (response) => {
        if (!response.ok) {
           const data = await response.json().catch(() => ({}));
           throw new Error(data.error || 'Unable to get a response from the AI model.');
        }
        
        const providerHeader = response.headers.get('X-Provider');
        const modelHeader = response.headers.get('X-Model');
        const providerInfo = providerHeader && modelHeader ? `via ${providerHeader} (${modelHeader})` : undefined;
        const ragSourcesHeader = response.headers.get('X-RAG-Sources');
        const ragSources = ragSourcesHeader ? JSON.parse(decodeURIComponent(ragSourcesHeader)) as { documentName: string; pageNumber: number; section: string; score: number }[] : [];
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        const assistantMsgId = crypto.randomUUID();
        
        addMessage({ 
          id: assistantMsgId, 
          role: 'assistant', 
          content: '',
          providerInfo
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
        
        const sourcesText = ragSources.length ? `\n\n**Retrieved Sources**\n${ragSources.map((source) => `- ${source.documentName} — Page ${source.pageNumber}, ${source.section} (${(source.score * 100).toFixed(1)}% relevance)`).join('\n')}` : '';
        if (sourcesText) {
          accumulatedContent += sourcesText;
          updateMessage(assistantMsgId, accumulatedContent);
        }
        const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: accumulatedContent, providerInfo };
        if (activeConversationId) {
            await saveMessageToDB(assistantMsg, activeConversationId);
        }
      })
      .catch((error: Error) => {
        addMessage({ 
          id: crypto.randomUUID(), 
          role: 'assistant', 
          content: `${error.message}`,
          isError: true
        });
      })
      .finally(() => setIsLoading(false));
  };

  if (!isMounted) return null; // Avoid hydration mismatch
  
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar for History */}
      <Card className="w-64 flex-shrink-0 flex flex-col bg-zinc-900 border-zinc-800 overflow-hidden shadow-lg hidden md:flex">
        <div className="p-4 border-b border-zinc-800 flex gap-2">
            <Button onClick={handleClearChat} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700">
                <RefreshCw className="h-4 w-4 mr-2" /> New
            </Button>
            <Button onClick={deleteAllConversations} variant="outline" title="Delete all history" className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 px-3">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
        <ScrollArea className="flex-1 p-2 min-h-0">
            <div className="space-y-2">
                {conversations.length === 0 && (
                    <div className="text-center text-sm text-zinc-500 mt-4">
                        No recent history
                    </div>
                )}
                {conversations.map((conv) => (
                    <div 
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-zinc-800 transition-colors ${conversationId === conv.id ? 'bg-zinc-800 border-l-2 border-blue-500' : ''}`}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <MessageSquare className="h-4 w-4 shrink-0 text-zinc-400" />
                            <span className="text-sm truncate text-zinc-300">{conv.title}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={(e) => deleteConversation(conv.id, e)} className="h-6 w-6 text-zinc-500 hover:text-red-400 opacity-0 hover:opacity-100 transition-opacity">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all rounded-xl border-2 ${isDragOver ? 'border-blue-500 bg-blue-500/5' : 'border-transparent'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Workbench</h1>
              <p className="text-zinc-400">Chat with AI or trigger autonomous agent workflows.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 shadow-sm">
                <button
                  id="agent-mode"
                  type="button"
                  role="switch"
                  aria-checked={agentMode}
                  onClick={() => setAgentMode(!agentMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 ${agentMode ? 'bg-blue-600' : 'bg-zinc-700'}`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${agentMode ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
                <Label htmlFor="agent-mode" onClick={() => setAgentMode(!agentMode)} className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                  <BrainCircuit className="h-4 w-4 text-blue-400" /> Agent Mode
                </Label>
              </div>

              <div className="mx-2 h-6 w-px bg-zinc-800 hidden sm:block"></div>
              
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={messages.length === 0} className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1">
                  <Server className="h-4 w-4 text-zinc-400 mr-2" />
                  <Select value={selectedModel} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-[180px] h-7 border-none bg-transparent focus:ring-0 text-sm">
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      <SelectItem value="auto">🌟 Auto (Orchestrator)</SelectItem>
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

          <Card className={`flex-1 flex flex-col bg-zinc-900 border-zinc-800 overflow-hidden min-h-0 shadow-lg ${isDragOver ? 'ring-2 ring-blue-500 border-transparent' : ''}`}>
            {isDragOver && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm rounded-xl">
                <UploadCloud className="h-16 w-16 text-blue-500 mb-4 animate-bounce" />
                <h2 className="text-xl font-bold text-white">Drop files here to upload</h2>
                <p className="text-zinc-400">Documents will be processed into the Knowledge Base</p>
              </div>
            )}
            
            <ScrollArea className="flex-1 min-h-0">
              <div ref={chatContainerRef} className="p-4 space-y-6">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500 text-center px-4">
                    <Bot className="h-16 w-16 mb-4 text-zinc-700" />
                    <h2 className="text-xl font-semibold text-zinc-300 mb-2">Welcome to Sovereign AI Workbench</h2>
                    <p className="max-w-md text-sm">
                      I can help you analyze data, inspect vision reports, read documents, and run complex multi-step agent plans.
                    </p>
                    <div className="mt-8 flex gap-4 text-xs">
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                        <MessageSquare className="h-5 w-5 mb-2 mx-auto text-blue-400" />
                        Ask Questions
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                        <UploadCloud className="h-5 w-5 mb-2 mx-auto text-green-400" />
                        Drop Documents
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                        <BrainCircuit className="h-5 w-5 mb-2 mx-auto text-purple-400" />
                        Run Agent
                      </div>
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.isError ? 'bg-red-900/50' : 'bg-blue-600/20 shadow-sm border border-blue-500/30'}`}>
                        {message.isError ? <AlertCircle className="h-5 w-5 text-red-500" /> : <Bot className="h-5 w-5 text-blue-400" />}
                      </div>
                    )}
                    
                    <div
                      className={`px-5 py-3.5 rounded-2xl max-w-[85%] flex flex-col gap-1 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : message.isError
                          ? 'bg-red-950/30 border border-red-900 text-red-400 rounded-tl-sm'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-tl-sm'
                      }`}
                    >
                      <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed overflow-x-auto">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.providerInfo && (
                        <span className="text-[10px] text-zinc-500 self-end mt-2 flex items-center gap-1">
                          <Server className="h-3 w-3" /> {message.providerInfo}
                        </span>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
                        <User className="h-5 w-5 text-zinc-300" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                    </div>
                    <div className="px-5 py-3.5 rounded-2xl rounded-tl-sm bg-zinc-950 border border-zinc-800 flex items-center space-x-2">
                       <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce"></div>
                       <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                       <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 bg-zinc-950 border-t border-zinc-800 mt-auto">
              <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="shrink-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 rounded-full h-10 w-10 relative overflow-hidden group"
                >
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const evt = { dataTransfer: { files: e.target.files }, preventDefault: () => {} } as any;
                        handleDrop(evt);
                      }
                    }}
                  />
                  <Paperclip className="h-4 w-4 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                </Button>
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={agentMode ? "Describe the complex task for the agent to plan..." : "Ask your private AI..."}
                  className="flex-1 bg-zinc-900 border-zinc-700 text-white rounded-full px-5 h-10 focus-visible:ring-1 focus-visible:ring-blue-500 shadow-inner"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !input.trim()} 
                  className={`shrink-0 rounded-full h-10 px-6 transition-colors shadow-md ${agentMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {agentMode ? (
                     <><BrainCircuit className="h-4 w-4 mr-2" /> Run Agent</>
                  ) : (
                     <><Send className="h-4 w-4 mr-2" /> Send</>
                  )}
                </Button>
              </form>
            </div>
          </Card>
      </div>
      
      {/* Right Panel for Agent Workspace */}
      <AgentWorkspacePanel />
    </div>
  );
}
