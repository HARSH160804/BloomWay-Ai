import { useParams } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { ChatInterface } from '../components/chat/ChatInterface'

export function ChatPage() {
  const { repoId } = useParams<{ repoId: string }>()

  if (!repoId) {
    return <div>Repository not found</div>
  }

  return (
    <MainLayout>
      <div className="h-full">
        <ChatInterface repoId={repoId} />
      </div>
    </MainLayout>
  )
}
