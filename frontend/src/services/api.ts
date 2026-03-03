import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://x7xqq42tpj.execute-api.us-east-1.amazonaws.com/Prod'

console.log('API_BASE_URL:', API_BASE_URL)

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds for ingestion
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.baseURL)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor with retry logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as any

    // Initialize retry count
    if (!config._retryCount) {
      config._retryCount = 0
    }

    // Retry on 429 (rate limit) or 5xx errors, but NOT for ingestion POST (would cause duplicates)
    const isIngest = config.method === 'post' && config.url?.includes('/ingest')
    const shouldRetry =
      !isIngest && (
        error.response?.status === 429 ||
        (error.response?.status && error.response.status >= 500)
      )

    if (shouldRetry && config._retryCount < 3) {
      config._retryCount += 1

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, config._retryCount - 1) * 1000

      await new Promise(resolve => setTimeout(resolve, delay))

      return apiClient(config)
    }

    return Promise.reject(error)
  }
)

// Type definitions
export interface IngestRequest {
  source_type: 'github' | 'zip'
  source: string
  auth_token?: string
  file?: File
}

export interface IngestResponse {
  repo_id: string
  session_id: string
  source: string
  status: 'completed' | 'processing' | 'failed'
  file_count: number
  chunk_count: number
  file_paths?: string[]
  tech_stack: {
    languages: string[]
    frameworks: string[]
    libraries: string[]
  }
}

export interface ArchitectureResponse {
  repo_id: string
  architecture: {
    overview: string
    components: Array<{
      name: string
      description: string
      files: string[]
    }>
    patterns: string[]
    data_flow: string
    entry_points: string[]
  }
  diagram: string
  generated_at: string
}

export interface FileExplanationResponse {
  repo_id: string
  file_path: string
  explanation: {
    purpose: string
    key_functions: Array<{
      name: string
      description: string
      line: number
    }>
    patterns: string[]
    dependencies: string[]
    complexity: {
      lines: number
      functions: number
    }
  }
  related_files: string[]
  level: 'beginner' | 'intermediate' | 'advanced'
  generated_at: string
}

export interface ChatRequest {
  message: string
  session_id?: string
  scope?: {
    type: 'all' | 'file' | 'directory'
    path?: string
  }
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface ChatResponse {
  repo_id: string
  response: string
  citations: Array<{
    file: string
    line?: number
    snippet: string
  }>
  suggested_questions: string[]
  confidence: 'high' | 'medium' | 'low'
  session_id: string
}

export interface ExportRequest {
  format: 'markdown' | 'pdf'
}

export interface ExportResponse {
  session_id: string
  download_url: string
  format: string
  expires_at: string
}

// API functions
export const ingestRepository = (data: IngestRequest): Promise<AxiosResponse<IngestResponse>> => {
  console.log('ingestRepository called with:', { source_type: data.source_type, has_file: !!data.file })

  if (data.source_type === 'zip' && data.file) {
    const formData = new FormData()
    formData.append('source_type', 'zip')
    formData.append('file', data.file)
    if (data.auth_token) {
      formData.append('auth_token', data.auth_token)
    }

    console.log('Making ZIP upload request to:', `${API_BASE_URL}/repos/ingest`)

    // Use a separate axios instance for FormData to avoid Content-Type conflicts
    return axios.post(`${API_BASE_URL}/repos/ingest`, formData, {
      timeout: 60000,
      headers: {
        // Let browser set Content-Type with boundary for multipart/form-data
      },
    })
  }

  if (data.source_type === 'github') {
    console.log('Making GitHub URL request')
    return apiClient.post('/repos/ingest', {
      source_type: 'github',
      source: data.source,
      auth_token: data.auth_token,
    })
  }

  throw new Error('Invalid source_type')
}

export const getArchitecture = (
  repositoryId: string,
  level?: 'basic' | 'intermediate' | 'advanced'
): Promise<AxiosResponse<ArchitectureResponse>> =>
  apiClient.get(`/repos/${repositoryId}/architecture`, {
    params: level ? { level } : undefined
  })

export const explainFile = (
  repositoryId: string,
  filePath: string,
  level?: 'beginner' | 'intermediate' | 'advanced'
): Promise<AxiosResponse<FileExplanationResponse>> =>
  apiClient.get(`/repos/${repositoryId}/files/${encodeURIComponent(filePath)}`, {
    params: level ? { level } : undefined
  })

export const chat = (
  repositoryId: string,
  data: ChatRequest
): Promise<AxiosResponse<ChatResponse>> =>
  apiClient.post(`/repos/${repositoryId}/chat`, data)

export const exportDocumentation = (
  sessionId: string,
  data: ExportRequest
): Promise<AxiosResponse<ExportResponse>> =>
  apiClient.post(`/sessions/${sessionId}/export`, data)

// Legacy api object for backward compatibility
export const api = {
  ingestRepository,
  getArchitecture,
  explainFile,
  chat,
  exportDocumentation,
}
