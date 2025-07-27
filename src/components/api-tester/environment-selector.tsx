'use client'

import type { Environment } from '@/types/api-tester'

interface EnvironmentSelectorProps {
  currentEnvironment: Environment | null
  onEnvironmentChange: (environment: Environment | null) => void
}

export function EnvironmentSelector({ currentEnvironment, onEnvironmentChange }: EnvironmentSelectorProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Environment</h3>
      <div className="text-sm text-muted-foreground">
        Environment selector will be implemented in task 8
      </div>
    </div>
  )
}