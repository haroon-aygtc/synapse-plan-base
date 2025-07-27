'use client'

import type { ApiResponse } from '@/types/api-tester'

interface ResponseViewerProps {
  response: ApiResponse | null
  loading: boolean
  error?: string
}

export function ResponseViewer({ response, loading, error }: ResponseViewerProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Response</h3>
      {loading && (
        <div className="text-sm text-muted-foreground">
          Loading...
        </div>
      )}
      {error && (
        <div className="text-sm text-red-500">
          Error: {error}
        </div>
      )}
      {!loading && !error && !response && (
        <div className="text-sm text-muted-foreground">
          Send a request to see the response
        </div>
      )}
      {response && (
        <div className="text-sm text-muted-foreground">
          Response viewer will be implemented in task 7
        </div>
      )}
    </div>
  )
}