/**
 * @fileoverview Main chat interface for LOCO RAG Engine.
 * 
 * A polished chat UI using shadcn components for asking questions
 * about ingested documents with source citations.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { locoApi, QueryResponse, Reference } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  FileText,
  Settings,
  Sparkles,
  User,
  Bot,
  Loader2
} from 'lucide-react';

/** Chat message with role and content. */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  references?: Reference[];
}

/**
 * Main chat page component using shadcn/ui.
 */
export default function LocoChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Handle sending a message.
   */
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response: QueryResponse = await locoApi.ask(userMessage);

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          references: response.references,
        },
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
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
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">LOCO RAG Engine</h1>
            <p className="text-xs text-muted-foreground">Local-Only Contextual Orchestration</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/admin" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Admin Panel
          </a>
        </Button>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Ask anything about your documents
              </h2>
              <p className="text-muted-foreground max-w-md">
                Upload documents in the Admin Panel, then ask questions here.
                I&apos;ll provide answers with source citations.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <Card className={`max-w-[80%] ${message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
                }`}>
                <CardContent className="p-4">
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                  {/* Source References */}
                  {message.references && message.references.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {message.references.map((ref, refIndex) => (
                            <Badge
                              key={refIndex}
                              variant="secondary"
                              className="cursor-help"
                              title={ref.snippet}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              {ref.source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {message.role === 'user' && (
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="bg-secondary">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-4">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-muted">
                <CardContent className="p-4 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error message */}
          {error && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="p-4 text-destructive">
                ⚠️ {error}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <footer className="p-4 border-t">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
