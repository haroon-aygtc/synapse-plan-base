'use client';

import React from 'react';
import { AuditLog } from '@/components/admin/AuditLog';

export default function AuditPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-full w-full p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-2">
            Track all user actions and system events for security and compliance
          </p>
        </div>
        <AuditLog />
      </div>
    </div>
  );
}
