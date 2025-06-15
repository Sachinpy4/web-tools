'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export function withAuth(Component: React.ComponentType) {
  return function AuthenticatedComponent(props: any) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      }
    }, [user, isLoading, router]);

    // Show loading while checking auth
    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    // If not authenticated, don't show the component
    if (!user) {
      return null;
    }

    // If authenticated, render the component
    return <Component {...props} />;
  };
}

export function withAdminAuth(Component: React.ComponentType) {
  return function AdminComponent(props: any) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!user) {
          router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
        } else if (user.role !== 'admin') {
          router.push('/');
        }
      }
    }, [user, isLoading, router]);

    // Show loading while checking auth
    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    // If not authenticated or not admin, don't show the component
    if (!user || user.role !== 'admin') {
      return null;
    }

    // If authenticated and is admin, render the component
    return <Component {...props} />;
  };
} 