'use client'

import type { AuthConfig } from '@/types/api-tester'

interface AuthenticationPanelProps {
  authConfig: AuthConfig | null
  onAuthChange: (config: AuthConfig | null) => void
  environment: string
}

export function AuthenticationPanel({ authConfig, onAuthChange, environment }: AuthenticationPanelProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Authentication</h3>
      <div className="text-sm text-muted-foreground">
        Authentication panel will be implemented in task 5
      </div>
    </div>
  )
}