/**
 * @fileoverview Admin dashboard for LOCO RAG Engine.
 * 
 * Provides file upload, configuration settings, and authentication
 * for managing the RAG system.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { locoApi, getAuthToken, clearAuthToken, Config, HealthResponse } from '@/lib/api';

/**
 * Admin dashboard page component.
 */
export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [needsSetup, setNeedsSetup] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<Config | null>(null);
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Check authentication status on mount.
     */
    useEffect(() => {
        checkStatus();
    }, []);

    /**
     * Check backend health and auth status.
     */
    const checkStatus = async () => {
        try {
            const healthData = await locoApi.health();
            setHealth(healthData);
            setNeedsSetup(!healthData.admin_setup);

            // Check if we have a valid token
            const token = getAuthToken();
            if (token && healthData.admin_setup) {
                try {
                    const configData = await locoApi.getConfig();
                    setConfig(configData);
                    setIsAuthenticated(true);
                } catch {
                    clearAuthToken();
                    setIsAuthenticated(false);
                }
            }
        } catch {
            setError('Failed to connect to backend. Is it running?');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle admin account setup.
     */
    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        try {
            await locoApi.setup(password);
            setNeedsSetup(false);
            setSuccess('Admin account created! Please login.');
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Setup failed');
        }
    };

    /**
     * Handle admin login.
     */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const success = await locoApi.login(password);
            if (success) {
                setIsAuthenticated(true);
                const configData = await locoApi.getConfig();
                setConfig(configData);
                setPassword('');
            } else {
                setError('Invalid password');
            }
        } catch {
            setError('Login failed');
        }
    };

    /**
     * Handle logout.
     */
    const handleLogout = () => {
        clearAuthToken();
        setIsAuthenticated(false);
        setConfig(null);
    };

    /**
     * Handle file upload.
     */
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setSuccess(null);
        setUploadProgress(`Uploading ${file.name}...`);

        try {
            const result = await locoApi.upload(file);
            setSuccess(`${result.filename} uploaded! ${result.chunks_processed} chunks processed.`);
            setUploadProgress(null);

            // Refresh health to get updated document count
            const healthData = await locoApi.health();
            setHealth(healthData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            setUploadProgress(null);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    /**
     * Handle configuration update.
     */
    const handleConfigUpdate = async (updates: Partial<Config>) => {
        try {
            const newConfig = await locoApi.updateConfig(updates);
            setConfig(newConfig);
            setSuccess('Configuration updated!');
        } catch {
            setError('Failed to update configuration');
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // Setup form
    if (needsSetup) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-white p-6">
                <div className="w-full max-w-md">
                    <h1 className="text-2xl font-bold text-center mb-2">🚀 Welcome to LOCO</h1>
                    <p className="text-zinc-400 text-center mb-8">
                        Create your admin password to get started
                    </p>

                    <form onSubmit={handleSetup} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password (8+ characters)"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-3 rounded-lg font-semibold"
                        >
                            Create Admin Account
                        </button>
                    </form>

                    {error && (
                        <p className="mt-4 text-red-400 text-center">{error}</p>
                    )}
                    {success && (
                        <p className="mt-4 text-green-400 text-center">{success}</p>
                    )}
                </div>
            </div>
        );
    }

    // Login form
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-white p-6">
                <div className="w-full max-w-md">
                    <h1 className="text-2xl font-bold text-center mb-2">🔐 Admin Login</h1>
                    <p className="text-zinc-400 text-center mb-8">
                        Enter your password to access the admin panel
                    </p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-3 rounded-lg font-semibold"
                        >
                            Login
                        </button>
                    </form>

                    {error && (
                        <p className="mt-4 text-red-400 text-center">{error}</p>
                    )}

                    <a
                        href="/"
                        className="block mt-6 text-center text-zinc-400 hover:text-white transition-colors"
                    >
                        ← Back to Chat
                    </a>
                </div>
            </div>
        );
    }

    // Admin dashboard
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⚙️</span>
                    <h1 className="text-xl font-bold">Admin Dashboard</h1>
                </div>
                <div className="flex items-center gap-4">
                    <a
                        href="/"
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        ← Back to Chat
                    </a>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 space-y-8">
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-zinc-400 text-sm">Documents</p>
                        <p className="text-3xl font-bold text-blue-400">
                            {health?.documents ?? 0}
                        </p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-zinc-400 text-sm">Model</p>
                        <p className="text-xl font-semibold">{config?.model ?? 'N/A'}</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-zinc-400 text-sm">Status</p>
                        <p className="text-xl font-semibold text-green-400">
                            {health?.status === 'healthy' ? '✓ Healthy' : '✗ Error'}
                        </p>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                        <p className="text-red-300">⚠️ {error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
                        <p className="text-green-300">✓ {success}</p>
                    </div>
                )}

                {/* File Upload */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">📄 Upload Documents</h2>
                    <p className="text-zinc-400 text-sm mb-4">
                        Upload PDF or text files to add to your knowledge base.
                    </p>

                    <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.txt"
                            onChange={handleUpload}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer"
                        >
                            <span className="text-4xl mb-4 block">📁</span>
                            <p className="text-zinc-300 mb-2">
                                {uploadProgress || 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-zinc-500 text-sm">PDF, TXT up to 10MB</p>
                        </label>
                    </div>
                </section>

                {/* Settings */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">⚙️ Settings</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">
                                Temperature ({config?.temperature ?? 0.7})
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={config?.temperature ?? 0.7}
                                onChange={(e) =>
                                    handleConfigUpdate({ temperature: parseFloat(e.target.value) })
                                }
                                className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span>Precise</span>
                                <span>Creative</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">
                                Top K Sources ({config?.top_k ?? 3})
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={config?.top_k ?? 3}
                                onChange={(e) =>
                                    handleConfigUpdate({ top_k: parseInt(e.target.value) })
                                }
                                className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span>1</span>
                                <span>10</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
