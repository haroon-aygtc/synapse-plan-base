import { APXClient, APXClientOptions, createAPXClient } from '../../../backend/apps/gateway/src/websocket/apix-client';
import { APXMessageType, APXSecurityLevel, APXPermissionLevel, APXStreamState } from '../../../backend/libs/shared/src/enums/apix-protocol.enum';

// Re-export types and enums
export {
  APXClient,
  APXClientOptions,
  APXMessageType,
  APXSecurityLevel,
  APXPermissionLevel,
  APXStreamState,
};

// Export factory function
export function createClient(options: APXClientOptions): APXClient {
  return createAPXClient(options);
}

// Create a singleton client instance for the browser
let browserClient: APXClient | null = null;

export function getClient(options?: Partial<APXClientOptions>): APXClient {
  if (typeof window === 'undefined') {
    // Server-side - always create a new instance
    if (!options || !options.url || !options.token) {
      throw new Error('URL and token are required for server-side APIX client');
    }
    return createAPXClient(options as APXClientOptions);
  }

  // Browser-side - use singleton
  if (!browserClient) {
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    
    if (!token && (!options || !options.token)) {
      throw new Error('No authentication token available for APIX client');
    }
    
    const url = options?.url || process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
    
    browserClient = createAPXClient({
      url,
      token: options?.token || token!,
      autoConnect: options?.autoConnect !== false,
      debug: options?.debug || false,
    });
  }
  
  return browserClient;
}

// Helper function to reset the client (useful for testing)
export function resetClient(): void {
  if (browserClient) {
    browserClient.disconnect();
    browserClient = null;
  }
}