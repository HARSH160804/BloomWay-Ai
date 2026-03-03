import { useParams } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { useArchitecture } from '../hooks/useArchitecture'
import mermaid from 'mermaid'

export function ArchitecturePage() {
  const { repoId } = useParams<{ repoId: string }>()
  const { data, isLoading, error } = useArchitecture(repoId, 'intermediate')
  const mermaidRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mermaidRef.current && data?.diagram) {
      mermaid.initialize({ startOnLoad: true, theme: 'dark' })
      mermaid.contentLoaded()
    }
  }, [data])

  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading architecture...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-red-600 dark:text-red-400">
            <p>Failed to load architecture</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-400">No architecture data available</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Architecture Overview</h1>

          {/* Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <p className="text-gray-700 dark:text-gray-300">{data.architecture.overview}</p>
          </div>

          {/* Diagram */}
          {data.diagram && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">System Diagram</h2>
              <div ref={mermaidRef} className="mermaid">
                {data.diagram}
              </div>
            </div>
          )}

          {/* Components */}
          {data.architecture.components && data.architecture.components.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Components</h2>
              <div className="space-y-4">
                {data.architecture.components.map((component) => (
                  <div key={component.name} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-1">{component.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {component.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {component.files.map((file) => (
                        <span
                          key={file}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded"
                        >
                          {file}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {data.architecture.patterns && data.architecture.patterns.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-3">Design Patterns</h2>
              <div className="flex flex-wrap gap-2">
                {data.architecture.patterns.map((pattern) => (
                  <span
                    key={pattern}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
