import { useState } from 'react'
import { FileTree } from '../explorer/FileTree'

interface SidebarProps {
  repoId: string
  onFileSelect?: (filePath: string) => void
}

export function Sidebar({ repoId, onFileSelect }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-[#1a1a1a]">
        <div className="relative">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-10 bg-black border border-[#1a1a1a] rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm text-gray-200 placeholder-gray-500"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        <FileTree repoId={repoId} searchQuery={searchQuery} onFileSelect={onFileSelect} />
      </div>
    </div>
  )
}
