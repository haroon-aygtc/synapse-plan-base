'use client';

import React from 'react';
import { UserManagement } from '@/components/admin/UserManagement';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-full w-full p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users, roles, and permissions for your organization
          </p>
        </div>
        <UserManagement />
      </div>
    </div>
  );
}
