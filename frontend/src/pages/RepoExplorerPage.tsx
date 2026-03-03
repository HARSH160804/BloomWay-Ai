import { useParams, Link } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { Sidebar } from '../components/layout/Sidebar'

export function RepoExplorerPage() {
  const { repoId } = useParams<{ repoId: string }>()

  if (!repoId) {
    return <div>Repository not found</div>
  }

  return (
    <MainLayout showSidebar>
      <div className="flex h-full">
        <Sidebar repoId={repoId} />
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">Repository Explorer</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Select a file from the sidebar to view its contents and get AI-powered explanations.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Link
                to={`/repo/${repoId}/architecture`}
                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="text-4xl mb-3">🏗️</div>
                <h3 className="font-semibold mb-2">Architecture</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View system architecture and component relationships
                </p>
              </Link>

              <Link
                to={`/repo/${repoId}/chat`}
                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="text-4xl mb-3">💬</div>
                <h3 className="font-semibold mb-2">Chat</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ask questions about the codebase
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
