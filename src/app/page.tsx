'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">NextGen ERP</h1>
        <p className="mt-2 text-muted-foreground">Redirecting to dashboard...</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
