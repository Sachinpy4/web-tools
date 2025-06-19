'use client'

import React from 'react';
import { ProcessingModeProvider } from '@/lib/context/ProcessingModeContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SimplePWAProvider } from '@/components/pwa/SimplePWAProvider';
import { PWAErrorBoundary } from '@/components/pwa/PWAErrorBoundary';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <TooltipProvider>
      <ProcessingModeProvider>
        <PWAErrorBoundary>
          <SimplePWAProvider>
            {children}
          </SimplePWAProvider>
        </PWAErrorBoundary>
      </ProcessingModeProvider>
    </TooltipProvider>
  );
} 