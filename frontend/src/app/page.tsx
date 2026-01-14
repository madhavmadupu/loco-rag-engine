/**
 * @fileoverview Main chat interface for LOCO RAG Engine.
 * 
 * Provides a clean, dark-themed chat UI for asking questions
 * about ingested documents with source citations.
 */

'use client';

import { useState } from 'react';
import { locoApi, QueryResponse, Reference } from '@/lib/api';

/** Chat message with role and content. */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  references?: Reference[];
}

/**
 * Main chat page component.
 */
export default function LocoChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            LOCO RAG Engine
          </h1>
        </div>
        <a
          href="/admin"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Admin Panel →
        </a>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-6xl mb-4">📚</span>
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">
              Ask anything about your documents
            </h2>
            <p className="text-zinc-500 max-w-md">
              Upload documents in the Admin Panel, then ask questions here.
              I&apos;ll provide answers with source citations.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg max-w-3xl ${message.role === 'user'
                ? 'bg-zinc-800 ml-auto'
                : 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/20'
              }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">
                {message.role === 'user' ? '👤' : '🤖'}
              </span>
              <div className="flex-1">
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Source References */}
                {message.references && message.references.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-zinc-400 mb-2">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.references.map((ref, refIndex) => (
                        <span
                          key={refIndex}
                          className="text-xs bg-zinc-800 px-2 py-1 rounded-full text-zinc-300 flex items-center gap-1"
                          title={ref.snippet}
                        >
                          📄 {ref.source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="p-4 rounded-lg bg-zinc-800/50 max-w-3xl">
            <div className="flex items-center gap-3 text-zinc-400">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span>Thinking...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-900/30 border border-red-500/30 max-w-3xl">
            <p className="text-red-300">⚠️ {error}</p>
          </div>
        )}
      </main>

      {/* Input area */}
      <footer className="p-4 border-t border-zinc-800">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-all"
          >
            Ask
          </button>
        </div>
      </footer>
    </div>
  );
}
