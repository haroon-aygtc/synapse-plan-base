'use client'

import type { ApiEndpoint, AuthConfig } from '@/types/api-tester'

interface RequestBuilderProps {
  endpoint: ApiEndpoint | null
  onSendRequest: (request: any) => void
  savedAuth: AuthConfig | null
  loading: boolean
}

export function RequestBuilder({ endpoint, onSendRequest, savedAuth, loading }: RequestBuilderProps) {
  if (!endpoint) {
    return (
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Request Builder</h3>
        <div className="text-sm text-muted-foreground">
          Select an endpoint to start building requests
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Request Builder</h3>
      <div className="text-sm text-muted-foreground">
        Request building functionality will be implemented in task 4
      </div>
    </div>
  )
}