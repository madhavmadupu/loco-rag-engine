/**
 * @fileoverview Professional Chat UI for LOCO RAG Engine.
 * 
 * A full-featured, ChatGPT-style chat interface with:
 * - Clean message bubbles with avatars
 * - Markdown rendering support
 * - Typing indicators
 * - Message actions (copy)
 * - Source citations
 * - Responsive sidebar
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { locoApi, QueryResponse, Reference } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Toaster, toast } from 'sonner';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import {
  Send,
  FileText,
  Settings,
  Sparkles,
  User,
  Bot,
  Loader2,
  Copy,
  Check,
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  X,
  ChevronRight
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
 * Format timestamp for display.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Main chat page component.
 */
export default function LocoChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get active session
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

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
    if (!activeSessionId) {
      createNewSession();
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Show processing toast
    const toastId = toast.loading('Processing your question...');

    const newUserMessage: Message = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    // Add user message
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        // Update title if first message
        const title = session.messages.length === 0
          ? userMessage.slice(0, 40) + (userMessage.length > 40 ? '...' : '')
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

      // Add assistant response
      setSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: [...session.messages, newAssistantMessage],
          };
        }
        return session;
      }));

      toast.success('Response received', { id: toastId });
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
      <Toaster richColors position="top-right" />
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} border-r bg-muted/30 flex flex-col transition-all duration-300 overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <Button
            onClick={createNewSession}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Chat History */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${session.id === activeSessionId
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted'
                  }`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate text-sm">{session.title}</span>
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
        <div className="p-4 border-t">
          <Button variant="ghost" asChild className="w-full justify-start gap-2">
            <a href="/admin">
              <Settings className="w-4 h-4" />
              Admin Panel
            </a>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-4 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-br from-blue-500 to-purple-600">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">LOCO RAG Engine</h1>
              <p className="text-xs text-muted-foreground">Ask anything about your documents</p>
            </div>
          </div>

          <AnimatedThemeToggler className="mr-2" />
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {/* Empty State */}
            {messages.length === 0 && !activeSession && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">
                  Welcome to LOCO
                </h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  Your local-first RAG engine for intelligent document Q&A.
                  Upload documents in the Admin Panel, then start asking questions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    'What are the key points in my documents?',
                    'Summarize the main topics covered',
                    'Find information about...',
                    'Explain the relationship between...'
                  ].map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start h-auto p-4 text-left"
                      onClick={() => {
                        createNewSession();
                        setInput(suggestion);
                      }}
                    >
                      <ChevronRight className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{suggestion}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div key={message.id} className="group">
                <div className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={message.role === 'assistant'
                      ? 'bg-linear-to-br from-blue-500 to-purple-600 text-white'
                      : 'bg-secondary'
                    }>
                      {message.role === 'assistant' ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Content */}
                  <div className={`flex-1 space-y-2 ${message.role === 'user' ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {message.role === 'assistant' ? 'LOCO' : 'You'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    <Card className={`inline-block max-w-full ${message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50'
                      }`}>
                      <CardContent className="p-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap leading-relaxed m-0">
                            {message.content}
                          </p>
                        </div>

                        {/* Source References */}
                        {message.references && message.references.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Sources
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {message.references.map((ref, refIndex) => (
                                <Badge
                                  key={refIndex}
                                  variant="secondary"
                                  className="cursor-help text-xs"
                                  title={ref.snippet}
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  {ref.source}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Message Actions */}
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleCopy(message.id, message.content)}
                        >
                          {copiedId === message.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span className="ml-1 text-xs">
                            {copiedId === message.id ? 'Copied!' : 'Copy'}
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-4">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-600 text-white">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}


          </div>
        </ScrollArea>

        {/* Input Area */}
        <footer className="p-4 border-t bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-muted/50 rounded-2xl p-2 border">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents..."
                disabled={isLoading}
                className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-3 px-4"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="shrink-0 rounded-xl h-10 w-10"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              LOCO uses local LLMs to answer questions based on your uploaded documents.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
