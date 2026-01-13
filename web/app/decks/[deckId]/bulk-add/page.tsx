'use client';

import { Suspense, use } from 'react';
import { BulkAddCards } from '@/components/BulkAddCards';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export default function BulkAddCardsPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <BulkAddCards deckId={resolvedParams.deckId} />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-8 w-48" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full" />
      </main>
    </div>
  );
}
