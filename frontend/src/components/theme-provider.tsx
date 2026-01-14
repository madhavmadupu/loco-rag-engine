/**
 * @fileoverview Theme provider component for LOCO RAG Engine.
 * 
 * Wraps the application with next-themes ThemeProvider for
 * system-aware dark/light mode support.
 */

'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Theme provider component that wraps the application.
 */
export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
