/**
 * @fileoverview API client for LOCO RAG Engine backend.
 *
 * Provides typed methods for all backend API endpoints including
 * document ingestion, querying, and admin configuration.
 *
 * @license Apache-2.0
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Response from the query endpoint.
 */
export interface QueryResponse {
  answer: string;
  references: Reference[];
}

/**
 * A source reference from the knowledge base.
 */
export interface Reference {
  source: string;
  snippet: string;
  score: number;
}

/**
 * Response from the health endpoint.
 */
export interface HealthResponse {
  status: string;
  version: string;
  documents: number;
  admin_setup: boolean;
}

/**
 * Application configuration.
 */
export interface Config {
  model: string;
  temperature: number;
  top_k: number;
}

/**
 * Response from document ingestion.
 */
export interface IngestResponse {
  success: boolean;
  filename: string;
  chunks_processed: number;
  message: string;
}

/**
 * Store the JWT token in memory and localStorage.
 */
let authToken: string | null = null;

/**
 * Set the authentication token.
 * @param token - The JWT token from login.
 */
export function setAuthToken(token: string): void {
  authToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('loco_token', token);
  }
}

/**
 * Get the stored authentication token.
 * @returns The JWT token or null if not authenticated.
 */
export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('loco_token');
  }
  return authToken;
}

/**
 * Clear the authentication token.
 */
export function clearAuthToken(): void {
  authToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('loco_token');
  }
}

/**
 * Make an authenticated request to the API.
 * @param endpoint - The API endpoint path.
 * @param options - Fetch options.
 * @returns The fetch Response.
 */
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

/**
 * LOCO RAG Engine API client.
 */
export const locoApi = {
  /**
   * Check the health status of the backend.
   * @returns Health information including document count and setup status.
   */
  async health(): Promise<HealthResponse> {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  /**
   * Ask a question about the ingested documents.
   * @param query - The question to ask.
   * @param topK - Optional number of sources to retrieve.
   * @returns The answer and source references.
   */
  async ask(query: string, topK?: number): Promise<QueryResponse> {
    const res = await fetch(`${BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Query failed' }));
      throw new Error(error.detail || 'Query failed');
    }

    return res.json();
  },

  /**
   * Upload a document for ingestion.
   * @param file - The file to upload (PDF or text).
   * @returns Ingestion result with chunk count.
   */
  async upload(file: File): Promise<IngestResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/ingest`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return res.json();
  },

  /**
   * Create the initial admin account.
   * @param password - The admin password (min 8 characters).
   * @returns Success message.
   */
  async setup(password: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/admin/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Setup failed' }));
      throw new Error(error.detail || 'Setup failed');
    }

    return res.json();
  },

  /**
   * Authenticate as admin.
   * @param password - The admin password.
   * @returns True if login succeeded.
   */
  async login(password: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.access_token) {
      setAuthToken(data.access_token);
      return true;
    }

    return false;
  },

  /**
   * Get current configuration (requires auth).
   * @returns The current configuration.
   */
  async getConfig(): Promise<Config> {
    const res = await fetchWithAuth('/admin/config');

    if (!res.ok) {
      throw new Error('Failed to get config');
    }

    return res.json();
  },

  /**
   * Update configuration (requires auth).
   * @param config - Partial configuration to update.
   * @returns Updated configuration.
   */
  async updateConfig(config: Partial<Config>): Promise<Config> {
    const res = await fetchWithAuth('/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      throw new Error('Failed to update config');
    }

    const data = await res.json();
    return data.config;
  },
};
