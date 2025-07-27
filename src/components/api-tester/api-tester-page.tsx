'use client'

import { useState } from 'react'
import { EndpointExplorer } from './endpoint-explorer'
import { RequestBuilder } from './request-builder'
import { ResponseViewer } from './response-viewer'
import { AuthenticationPanel } from './authentication-panel'
import { EnvironmentSelector } from './environment-selector'
import { SavedTestsManager } from './saved-tests-manager'
import type { ApiEndpoint, ApiResponse, AuthConfig, Environment } from '@/types/api-tester'

export function ApiTesterPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null)
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment | null>(null)

  const handleSendRequest = async (request: any) => {
    setLoading(true)
    try {
      // Request handling will be implemented in later tasks
      console.log('Sending request:', request)
    } catch (error) {
      console.error('Request failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">API Tester</h1>
        <p className="text-muted-foreground mt-2">
          Test and explore API endpoints with authentication and parameter support
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Endpoint Explorer */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            <EnvironmentSelector
              currentEnvironment={currentEnvironment}
              onEnvironmentChange={setCurrentEnvironment}
            />
            <AuthenticationPanel
              authConfig={authConfig}
              onAuthChange={setAuthConfig}
              environment={currentEnvironment?.id || 'default'}
            />
            <EndpointExplorer
              selectedEndpoint={selectedEndpoint}
              onEndpointSelect={setSelectedEndpoint}
              environment={currentEnvironment}
            />
            <SavedTestsManager
              onLoadTest={(test) => {
                // Load test functionality will be implemented in later tasks
                console.log('Loading test:', test)
              }}
            />
          </div>
        </div>

        {/* Right Panel - Request Builder and Response */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            <RequestBuilder
              endpoint={selectedEndpoint}
              onSendRequest={handleSendRequest}
              savedAuth={authConfig}
              loading={loading}
            />
            <ResponseViewer
              response={response}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}