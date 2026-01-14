/**
 * @fileoverview Clean, minimal Chat UI for LOCO RAG Engine.
 * 
 * Inspired by llmchat.co - featuring:
 * - Clean sidebar with search
 * - Minimal header
 * - Clean message rendering
 * - Bottom input with clean styling
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { locoApi, QueryResponse, Reference } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Toaster, toast } from 'sonner';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import {
  Send,
  FileText,
  Settings,
  Plus,
  MessageSquare,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  Copy,
  Check,
  BookOpen
} from 'lucide-react';

/** Chat message with role and content. */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: Reference[];
  timestamp: Date;
}

/** Chat session. */
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

/**
 * Generate a unique ID.
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Copy text to clipboard.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main chat page component.
 */
export default function LocoChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get active session
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  // Filter sessions by search
  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Create a new chat session.
   */
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    toast.info('New chat started');
    inputRef.current?.focus();
  }, []);

  /**
   * Delete a chat session.
   */
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions.length > 1 ? sessions.find(s => s.id !== sessionId)?.id || null : null);
    }
    toast.success('Chat deleted');
  }, [activeSessionId, sessions]);

  /**
   * Handle copying message content.
   */
  const handleCopy = async (messageId: string, content: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Copied to clipboard');
    } else {
      toast.error('Failed to copy');
    }
  };

  /**
   * Handle sending a message.
   */
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Create session if none exists
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      currentSessionId = newSession.id;
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const toastId = toast.loading('Thinking...');

    const newUserMessage: Message = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    // Add user message
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        const title = session.messages.length === 0
          ? userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '')
          : session.title;
        return {
          ...session,
          title,
          messages: [...session.messages, newUserMessage],
        };
      }
      return session;
    }));

    try {
      const response: QueryResponse = await locoApi.ask(userMessage);

      const newAssistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.answer,
        references: response.references,
        timestamp: new Date(),
      };

      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [...session.messages, newAssistantMessage],
          };
        }
        return session;
      }));

      toast.success('Done', { id: toastId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Enter key press.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Toaster richColors position="top-center" />

      {/* Sidebar */}
      <aside className="w-64 border-r flex flex-col bg-muted/20">
        {/* Logo */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">loco.local</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={createNewSession}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pb-2">
          <Button
            onClick={createNewSession}
            variant="outline"
            className="w-full justify-start gap-2 h-9"
          >
            <Plus className="w-4 h-4" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        <Separator />

        {/* Chat History */}
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-0.5">
            {filteredSessions.map(session => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm transition-colors ${session.id === activeSessionId
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{session.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-3 border-t space-y-1">
          <Button variant="ghost" asChild className="w-full justify-start gap-2 h-9 text-sm">
            <a href="/admin">
              <Settings className="w-4 h-4" />
              Admin
            </a>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b">
          <div />
          <AnimatedThemeToggler />
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto py-8 px-6">
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-medium mb-2">
                  Ask anything about your documents
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Upload documents in Admin, then ask questions here.
                  Your data stays local and private.
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-8">
              {messages.map((message) => (
                <div key={message.id} className="group">
                  {/* User Message */}
                  {message.role === 'user' && (
                    <div className="flex justify-end mb-4">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  )}

                  {/* Assistant Message */}
                  {message.role === 'assistant' && (
                    <div className="space-y-3">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>

                      {/* Sources */}
                      {message.references && message.references.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {message.references.map((ref, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs font-normal gap-1 cursor-help"
                              title={ref.snippet}
                            >
                              <FileText className="w-3 h-3" />
                              {ref.source}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleCopy(message.id, message.content)}
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Copy className="w-3 h-3 mr-1" />
                          )}
                          {copiedId === message.id ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading */}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Input Area */}
        <footer className="p-4 border-t">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl border px-4 py-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                disabled={isLoading}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-sm placeholder:text-muted-foreground/60"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
