/**
 * @fileoverview Admin dashboard for LOCO RAG Engine.
 * 
 * Provides file upload, configuration settings, and authentication
 * for managing the RAG system, built with shadcn/ui components.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { locoApi, getAuthToken, clearAuthToken, Config, HealthResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import {
    Settings,
    Upload,
    FileText,
    LogOut,
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    Loader2,
    Database,
    Cpu,
    Thermometer,
    Layers,
    Shield
} from 'lucide-react';

/**
 * Admin dashboard page component using shadcn/ui.
 */
export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [needsSetup, setNeedsSetup] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<Config | null>(null);
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Check backend health and auth status.
     */
    const checkStatus = useCallback(async () => {
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
    }, []);

    /**
     * Check authentication status on mount.
     */
    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    /**
     * Handle admin account setup.
     */
    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

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
            toast.success('Admin account created! Please login.');
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
                toast.success('Welcome back!');
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
        toast.info('Logged out successfully');
    };

    /**
     * Handle file upload.
     */
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setUploadProgress(10);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => prev && prev < 90 ? prev + 10 : prev);
            }, 200);

            const result = await locoApi.upload(file);

            clearInterval(progressInterval);
            setUploadProgress(100);

            toast.success(`${result.filename} uploaded! ${result.chunks_processed} chunks processed.`);

            // Refresh health to get updated document count
            const healthData = await locoApi.health();
            setHealth(healthData);

            setTimeout(() => setUploadProgress(null), 1000);
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
            toast.success('Configuration updated!');
        } catch {
            toast.error('Failed to update configuration');
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Setup form
    if (needsSetup) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6">
                <Toaster richColors position="top-right" />
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Welcome to LOCO</CardTitle>
                        <CardDescription>Create your admin password to get started</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSetup} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Minimum 8 characters"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm">Confirm Password</Label>
                                <Input
                                    id="confirm"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" className="w-full">
                                Create Admin Account
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Login form
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6">
                <Toaster richColors position="top-right" />
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <Shield className="w-8 h-8 text-muted-foreground" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Admin Login</CardTitle>
                        <CardDescription>Enter your password to access the admin panel</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" className="w-full">
                                Login
                            </Button>

                            <div className="text-center">
                                <Button variant="link" asChild>
                                    <a href="/" className="text-muted-foreground">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Chat
                                    </a>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Admin dashboard
    return (
        <div className="min-h-screen bg-background">
            <Toaster richColors position="top-right" />

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Admin Dashboard</h1>
                        <p className="text-xs text-muted-foreground">Manage your RAG system</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AnimatedThemeToggler className="mr-2" />
                    <Button variant="outline" size="sm" asChild>
                        <a href="/" className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Chat
                        </a>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 space-y-6">
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Documents</p>
                                    <p className="text-2xl font-bold">{health?.documents ?? 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Cpu className="w-6 h-6 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Model</p>
                                    <p className="text-lg font-semibold">{config?.model ?? 'N/A'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <Thermometer className="w-6 h-6 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Temperature</p>
                                    <p className="text-2xl font-bold">{config?.temperature ?? 0.7}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <Badge variant="default" className="bg-green-500">
                                        {health?.status === 'healthy' ? 'Healthy' : 'Error'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Main Content Tabs */}
                <Tabs defaultValue="upload" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Documents
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Settings
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Upload Documents
                                </CardTitle>
                                <CardDescription>
                                    Upload PDF or text files to add to your knowledge base
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div
                                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.txt"
                                        onChange={handleUpload}
                                        className="hidden"
                                    />
                                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-lg font-medium mb-1">
                                        Click to upload or drag and drop
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        PDF, TXT up to 10MB
                                    </p>
                                </div>

                                {uploadProgress !== null && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Uploading...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <Progress value={uploadProgress} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Layers className="w-5 h-5" />
                                    Engine Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure the RAG engine behavior
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <Label>Temperature</Label>
                                            <span className="text-sm text-muted-foreground">
                                                {config?.temperature ?? 0.7}
                                            </span>
                                        </div>
                                        <Slider
                                            value={[config?.temperature ?? 0.7]}
                                            onValueChange={([value]) => handleConfigUpdate({ temperature: value })}
                                            min={0}
                                            max={2}
                                            step={0.1}
                                            className="w-full"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                            <span>Precise</span>
                                            <span>Creative</span>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <Label>Top K Sources</Label>
                                            <span className="text-sm text-muted-foreground">
                                                {config?.top_k ?? 3}
                                            </span>
                                        </div>
                                        <Slider
                                            value={[config?.top_k ?? 3]}
                                            onValueChange={([value]) => handleConfigUpdate({ top_k: value })}
                                            min={1}
                                            max={10}
                                            step={1}
                                            className="w-full"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                            <span>Fewer (faster)</span>
                                            <span>More (thorough)</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
