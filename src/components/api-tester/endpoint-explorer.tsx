'use client'

import type { ApiEndpoint, Environment } from '@/types/api-tester'

interface EndpointExplorerProps {
  selectedEndpoint: ApiEndpoint | null
  onEndpointSelect: (endpoint: ApiEndpoint) => void
  environment: Environment | null
}

export function EndpointExplorer({ selectedEndpoint, onEndpointSelect, environment }: EndpointExplorerProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">API Endpoints</h3>
      <div className="text-sm text-muted-foreground">
        Endpoint discovery will be implemented in task 2
      </div>
    </div>
  )
}