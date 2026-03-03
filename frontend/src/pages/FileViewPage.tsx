import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Sidebar } from '../components/layout/Sidebar'
import { Breadcrumb } from '../components/explorer/Breadcrumb'
import { CodeViewer } from '../components/code/CodeViewer'
import { SplitPane } from '../components/layout/SplitPane'
import { useApp } from '../context/AppContext'
import { useFileExplanation } from '../hooks/useFileExplanation'

export function FileViewPage() {
  const { repoId, filePath } = useParams<{ repoId: string; filePath: string }>()
  const { explanationLevel, setExplanationLevel } = useApp()
  const [selectedLine, setSelectedLine] = useState<number | null>(null)

  const decodedPath = filePath ? decodeURIComponent(filePath) : ''
  const { data: explanationData, isLoading, error } = useFileExplanation(
    repoId,
    decodedPath,
    explanationLevel
  )

  const mockCode = `// File content would be fetched from API
// Currently showing placeholder
import { useState, useEffect } from 'react'

export function ExampleComponent() {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    console.log('Count changed:', count)
  }, [count])
  
  return (
    <div>
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}`

  const language = decodedPath.split('.').pop() || 'typescript'

  return (
    <MainLayout>
      <div className="flex h-full">
        <Sidebar repoId={repoId!} />
        
        <div className="flex-1 flex flex-col">
          <Breadcrumb filePath={decodedPath} />
          
          <div className="flex-1 overflow-hidden">
            <SplitPane
              left={
                <div className="h-full">
                  <CodeViewer
                    code={mockCode}
                    language={language}
                    onLineClick={setSelectedLine}
                  />
                </div>
              }
              right={
                <div className="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
                  {/* Level Selector */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Explanation Level</label>
                    <div className="flex space-x-2">
                      {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setExplanationLevel(level)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            explanationLevel === level
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Loading State */}
                  {isLoading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="text-center py-8 text-red-600 dark:text-red-400">
                      Failed to load explanation
                    </div>
                  )}

                  {/* Explanation */}
                  {explanationData && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Purpose</h3>
                        <p className="text-gray-700 dark:text-gray-300">
                          {explanationData.explanation.purpose}
                        </p>
                      </div>

                      {explanationData.explanation.key_functions.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Key Functions</h3>
                          <div className="space-y-2">
                            {explanationData.explanation.key_functions.map((func) => (
                              <div
                                key={func.name}
                                className="p-3 bg-white dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-mono text-sm font-medium">{func.name}()</span>
                                  <span className="text-xs text-gray-500">Line {func.line}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {func.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {explanationData.explanation.patterns.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Patterns</h3>
                          <div className="flex flex-wrap gap-2">
                            {explanationData.explanation.patterns.map((pattern) => (
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

                      {explanationData.explanation.dependencies.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Dependencies</h3>
                          <div className="flex flex-wrap gap-2">
                            {explanationData.explanation.dependencies.map((dep) => (
                              <span
                                key={dep}
                                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono"
                              >
                                {dep}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Complexity</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {explanationData.explanation.complexity.lines}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Lines</div>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {explanationData.explanation.complexity.functions}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Functions</div>
                          </div>
                        </div>
                      </div>

                      {selectedLine && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Line {selectedLine} selected.</span> Ask a
                            question about this line in the chat.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
