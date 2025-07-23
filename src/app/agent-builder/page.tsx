import { Suspense } from 'react';
import { AgentBuilderInterface } from '@/components/agent-builder/AgentBuilderInterface';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AgentBuilderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Suspense fallback={<LoadingSpinner />}>
        <AgentBuilderInterface />
      </Suspense>
    </div>
  );
}