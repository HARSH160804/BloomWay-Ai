import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

interface MainLayoutProps {
  children: ReactNode
  showSidebar?: boolean
}

export function MainLayout({ children, showSidebar = false }: MainLayoutProps) {
  const { darkMode, toggleDarkMode, currentRepo } = useApp()

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                BloomWay AI
              </Link>
              {currentRepo && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">
                    {currentRepo.source ? currentRepo.source.split('/').pop() : 'Repository'}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{currentRepo.file_count} files</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-57px)]">
          {showSidebar && (
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              {/* Sidebar content will be injected here */}
            </aside>
          )}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>BloomWay AI - Powered by AWS Bedrock</p>
        </footer>
      </div>
    </div>
  )
}
