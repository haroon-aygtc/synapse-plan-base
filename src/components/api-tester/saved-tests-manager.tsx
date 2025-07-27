'use client'

import type { SavedTest } from '@/types/api-tester'

interface SavedTestsManagerProps {
  onLoadTest: (test: SavedTest) => void
}

export function SavedTestsManager({ onLoadTest }: SavedTestsManagerProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Saved Tests</h3>
      <div className="text-sm text-muted-foreground">
        Saved tests manager will be implemented in task 9
      </div>
    </div>
  )
}