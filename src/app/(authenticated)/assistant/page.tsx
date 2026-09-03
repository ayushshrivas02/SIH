'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Bot, User, Send, Paperclip, Server, AlertCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import { useAssistantStore, Message } from '@/lib/store/appStore';

export default function AssistantPage() {
  const { messages, setMessages, addMessage, updateMessage, clearMessages } = useAssistantStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<{name: string}[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('assistant_chat_messages');
    if (saved && messages.length === 0) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
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
    if (isMounted) {
      localStorage.setItem('assistant_chat_messages', JSON.stringify(messages));
    }
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMounted]);

  const handleClearChat = () => {
    clearMessages();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

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
        
        // Final update to ensure no chunks were missed
        updateMessage(assistantMsgId, accumulatedContent);
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-zinc-400">Chat with your sovereign local AI model.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleClearChat} className="mr-4 bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white">
            <RefreshCw className="h-4 w-4 mr-2" /> New Chat
          </Button>
          <Server className="h-4 w-4 text-zinc-400" />
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger className="w-[200px] bg-zinc-900 border-zinc-800">
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

      <Card className="flex-1 flex flex-col bg-zinc-900 border-zinc-800 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 mt-20">
                <Bot className="h-12 w-12 mb-4 text-zinc-700" />
                <p>Hello! I am your Sovereign AI Assistant.</p>
                <p className="text-sm mt-2">I am running locally on your infrastructure.</p>
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.isError ? 'bg-red-900/50' : 'bg-blue-600/20'}`}>
                    {message.isError ? <AlertCircle className="h-5 w-5 text-red-500" /> : <Bot className="h-5 w-5 text-blue-500" />}
                  </div>
                )}
                
                <div
                  className={`px-4 py-3 rounded-lg max-w-[80%] flex flex-col gap-1 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isError
                      ? 'bg-red-950/30 border border-red-900 text-red-400'
                      : 'bg-zinc-800 text-zinc-200'
                  }`}
                >
                  <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed overflow-x-auto">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  {message.providerInfo && (
                    <span className="text-[10px] text-zinc-500 self-end mt-1 italic">
                      {message.providerInfo}
                    </span>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 bg-zinc-950 border-t border-zinc-800">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="shrink-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
              <Paperclip className="h-4 w-4 text-zinc-400" />
            </Button>
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask your private AI..."
              className="flex-1 bg-zinc-900 border-zinc-700 text-white"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} className="shrink-0 bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
