'use client';

import React from 'react';
import { OrganizationSettings } from '@/components/admin/OrganizationSettings';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-full w-full p-6">
        <OrganizationSettings />
      </div>
    </div>
  );
}
