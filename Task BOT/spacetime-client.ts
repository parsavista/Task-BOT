'use client';

import { DbConnection } from '@/spacetime_module_bindings';

let clientInstance: DbConnection | null = null;

export function getSpacetimeClient(): DbConnection | null {
  if (typeof window === 'undefined') return null;
  
  if (!clientInstance) {
    try {
      const host = process.env.NEXT_PUBLIC_SPACETIME_HOST || 'ws://127.0.0.1:3000';
      const dbName = process.env.NEXT_PUBLIC_SPACETIME_DB_NAME || 'task-manager';
      
      clientInstance = DbConnection.builder()
        .withUri(host)
        .withModuleName(dbName)
        .onConnect((token: string, identity: string) => {
          console.log('Connected to SpacetimeDB', { identity });
        })
        .onError((error: string) => {
          console.error('SpacetimeDB error:', error);
        })
        .build();
    } catch (error) {
      console.error('Failed to initialize SpacetimeDB client:', error);
      return null;
    }
  }
  
  return clientInstance;
}

export function disconnectSpacetime(): void {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
  }
}
