import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { RepoInputPage } from './pages/RepoInputPage'
import { RepoExplorerPage } from './pages/RepoExplorerPage'
import { ArchitecturePage } from './pages/ArchitecturePage'
import { FileViewPage } from './pages/FileViewPage'
import { ChatPage } from './pages/ChatPage'

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<RepoInputPage />} />
        <Route path="/repo/:repoId" element={<RepoExplorerPage />} />
        <Route path="/repo/:repoId/architecture" element={<ArchitecturePage />} />
        <Route path="/repo/:repoId/chat" element={<ChatPage />} />
        <Route path="/repo/:repoId/file/:filePath" element={<FileViewPage />} />
      </Routes>
    </AppProvider>
  )
}

export default App
