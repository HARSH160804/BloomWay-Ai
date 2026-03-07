import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useRepoContext } from '../context/RepoContext'
import { ingestRepositoryAsync } from '../services/api'

export function RepoInputPage() {
  const navigate = useNavigate()
  const { } = useApp()
  const { repoId, status, setStatus } = useRepoContext()
  const [repoUrl, setRepoUrl] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<'github' | 'zip'>('github')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [shake, setShake] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [navTooltip, setNavTooltip] = useState<{ key: string; msg: string } | null>(null)

  const validateGithubUrl = (url: string): boolean => {
    const githubPattern = /^https?:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/
    return githubPattern.test(url)
  }

  const validateInput = (): boolean => {
    if (sourceType === 'github' && !repoUrl.trim()) {
      setError('Please provide a GitHub URL or upload a ZIP file')
      return false
    }
    if (sourceType === 'github' && !validateGithubUrl(repoUrl)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)')
      return false
    }
    if (sourceType === 'zip' && !zipFile) {
      setError('Please provide a GitHub URL or upload a ZIP file')
      return false
    }
    return true
  }

  const handleAnalyze = async () => {
    console.log('[handleAnalyze] called, sourceType:', sourceType, 'repoUrl:', repoUrl, 'zipFile:', zipFile?.name)
    setError(null)
    if (!validateInput()) {
      console.log('[handleAnalyze] validation failed')
      return
    }
    console.log('[handleAnalyze] validation passed, starting async ingestion')

    setStatus('uploading')

    try {
      console.log('[handleAnalyze] calling ingestRepositoryAsync...')

      let result
      if (sourceType === 'github') {
        result = await ingestRepositoryAsync({ source_type: 'github', source: repoUrl })
      } else {
        result = await ingestRepositoryAsync({ source_type: 'zip', source: '', file: zipFile! })
      }

      console.log('[handleAnalyze] ingestRepositoryAsync success:', result.data.job_id)

      // Navigate to ingestion status page with job_id
      const jobId = result.data.job_id
      navigate(`/ingestion/${jobId}`)
    } catch (err: any) {
      console.error('[handleAnalyze] error:', err)
      setStatus('error')

      let errorMessage = 'Failed to start repository ingestion'
      if (err.response?.data?.error) errorMessage = err.response.data.error
      else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout'))
        errorMessage = 'Request timed out. Please try again.'
      else if (err.code === 'ERR_NETWORK' || err.response?.status === 504)
        errorMessage = 'Network error. Please check your connection.'
      else if (err.message) errorMessage = err.message

      setError(errorMessage)

      // Trigger shake animation
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  const handleGithubUrlChange = (url: string) => {
    setRepoUrl(url)
    setSourceType('github')
    setZipFile(null)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.zip')) {
      setZipFile(file)
      setSourceType('zip')
      setRepoUrl('')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setZipFile(file)
      setSourceType('zip')
      setRepoUrl('')
    }
  }

  const handleNavClick = (key: string) => {
    if (!repoId) {
      setNavTooltip({ key, msg: 'Upload a GitHub repository first' })
      setTimeout(() => setNavTooltip(null), 2500)
    } else if (status === 'processing' || status === 'uploading') {
      setNavTooltip({ key, msg: 'Repository is still processing. Please wait.' })
      setTimeout(() => setNavTooltip(null), 2500)
    } else if (status === 'ready' && repoId) {
      const paths: Record<string, string> = {
        dashboard: `/repo/${repoId}`,
        architecture: `/repo/${repoId}/architecture`,
        chat: `/repo/${repoId}/chat`,
      }
      navigate(paths[key])
    }
  }

  const isProcessing = status === 'uploading' || status === 'processing'
  const isError = status === 'error'

  return (
    <div className="min-h-screen relative overflow-hidden font-sans" style={{ background: '#000000' }}>
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)',
        }}
      />
      {/* Glow orb */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.04) 0%, transparent 70%)',
        }}
      />

      {/* Header — Floating Capsule with Glassmorphism (sticky) */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pt-4 sm:pt-5">
        <header
          className="flex items-center justify-between w-full max-w-6xl px-4 sm:px-6 py-3 rounded-full"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <img
              src="/logo_bloomway.png"
              alt="BloomWay AI Logo"
              className="w-7 h-7 rounded-lg object-contain"
            />
            <span className="text-[13px] sm:text-[15px] font-semibold tracking-wide text-white">
              BLOOMWAY<span className="text-gray-500">·AI</span>
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'architecture', label: 'Architecture' },
              { key: 'chat', label: 'AI Chat' },
            ].map((item) => (
              <div key={item.key} className="relative hidden sm:block">
                <button
                  onClick={() => handleNavClick(item.key)}
                  className={`px-4 py-1.5 rounded-full text-xs tracking-wide border transition-all duration-200 font-mono ${!repoId || isProcessing
                    ? 'border-white/[0.06] text-gray-600 cursor-not-allowed'
                    : 'border-white/[0.15] text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/20 cursor-pointer'
                    }`}
                >
                  {item.label}
                </button>
                {navTooltip?.key === item.key && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-2 rounded-xl text-[11px] text-gray-300 shadow-xl whitespace-nowrap z-50 animate-fade-in"
                    style={{
                      background: 'rgba(0, 0, 0, 0.85)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {navTooltip.msg}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                      style={{ background: 'rgba(0, 0, 0, 0.85)', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* GitHub Icon Link */}
            <a
              href="https://github.com/HARSH160804/BloomWay-Ai"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 p-2 rounded-full border border-white/[0.15] text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200"
              aria-label="View on GitHub"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </header>
      </div>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-16">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] tracking-[0.1em] text-gray-400 mb-8"
          style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" style={{ boxShadow: '0 0 8px rgba(255,255,255,0.5)' }} />
          AI-POWERED CODEBASE INTELLIGENCE
        </div>

        {/* Heading */}
        <h1
          className="text-center font-bold mb-5 leading-[1.1] tracking-tight"
          style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}
        >
          <span
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #737373 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Turn Any Codebase Into
          </span>
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #ffffff, #a3a3a3)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Instant Understanding
          </span>
        </h1>

        <p className="text-gray-500 text-base text-center max-w-xl mb-4 leading-relaxed">
          Upload a repository and get architecture insights, diagrams, explanations,
          and AI-powered Q&A in seconds.
        </p>

        <p className="text-xs text-gray-600 tracking-[0.12em] text-center mb-12">
          Built on AWS &nbsp;•&nbsp; Powered by Amazon Bedrock &nbsp;•&nbsp; Serverless Architecture
        </p>

        {/* Input Card */}
        <div
          className="w-full max-w-6xl rounded-2xl p-6"
          style={{ background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 0 60px rgba(255,255,255,0.02)' }}
        >
          <label className="block text-[11px] text-gray-500 tracking-[0.1em] mb-2">
            GITHUB REPOSITORY URL
          </label>
          <div className="relative mb-5">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm">⌥</span>
            <input
              value={repoUrl}
              onChange={(e) => handleGithubUrlChange(e.target.value)}
              placeholder="https://github.com/owner/repository"
              disabled={isProcessing}
              className="w-full rounded-[10px] py-3 pl-9 pr-4 text-[13px] text-gray-200 placeholder-gray-600 outline-none transition-colors duration-200 disabled:opacity-50"
              style={{
                background: '#000000',
                border: `1px solid ${repoUrl ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
              }}
            />
          </div>

          {/* Try Sample Repos */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-[11px] text-gray-500 tracking-[0.05em]">try:</span>
            <button
              onClick={() => handleGithubUrlChange('https://github.com/HARSH160804/testrepo')}
              disabled={isProcessing}
              className="px-4 py-2 rounded-full text-[12px] tracking-wide border transition-all duration-200 border-white/[0.15] text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              Repository 1
            </button>
            <button
              onClick={() => handleGithubUrlChange('https://github.com/HARSH160804/Discover-Dollar-Assignment')}
              disabled={isProcessing}
              className="px-4 py-2 rounded-full text-[12px] tracking-wide border transition-all duration-200 border-white/[0.15] text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              Repository 2
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="mb-4 text-xs text-red-400 animate-fade-in">{error}</p>
          )}

          {/* OR divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <span className="text-gray-600 text-[11px] tracking-[0.1em]">OR</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className="rounded-xl py-7 px-5 text-center cursor-pointer transition-all duration-200 mb-5"
            style={{
              border: `2px dashed ${dragging ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
              background: dragging ? 'rgba(255,255,255,0.02)' : 'transparent',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="mb-2 flex justify-center">{zipFile ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            )}</div>
            <div className="text-[13px] text-gray-200 mb-1">
              {zipFile ? zipFile.name : 'Drop your ZIP file here'}
            </div>
            <div className="text-[11px] text-gray-500">
              {zipFile ? 'File ready' : 'or click to browse'}
            </div>
          </div>

          {/* Analyze Button — state-driven */}
          <button
            onClick={handleAnalyze}
            disabled={isProcessing}
            className={`w-full py-3.5 rounded-[10px] text-sm font-semibold tracking-wide transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px] font-mono ${
              shake ? 'animate-shake' : ''
            }`}
            style={{
              background: isError
                ? '#dc2626'
                : '#ffffff',
              color: isError ? '#ffffff' : '#000000',
              border: 'none',
              boxShadow: isProcessing
                ? '0 0 0 4px rgba(255, 255, 255, 0.05)'
                : isError
                ? '0 4px 20px rgba(220, 38, 38, 0.4)'
                : '0 4px 20px rgba(255, 255, 255, 0.1)',
              animation: isProcessing ? 'pulse 2s ease-in-out infinite' : 'none',
              pointerEvents: isProcessing ? 'none' : 'auto',
            }}
          >
            {isProcessing ? (
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span>
                {isError ? 'Retry' : 'Analyze Repository →'}
              </span>
            )}
          </button>

          {/* CSS animations */}
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
              20%, 40%, 60%, 80% { transform: translateX(4px); }
            }

            @keyframes pulse {
              0%, 100% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.9;
                transform: scale(0.98);
              }
            }

            .animate-shake {
              animation: shake 0.5s ease-in-out;
            }
          `}</style>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 w-full max-w-6xl mt-14">
          {[
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              ),
              title: 'Architecture Intelligence',
              desc: 'Automatic system overview, visual diagrams, and pattern detection across your entire codebase.',
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ),
              title: 'Code Chat',
              desc: 'Ask questions about any file. Get context-aware answers with precise code citations.',
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  <path d="M10 9H8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                </svg>
              ),
              title: 'Smart Documentation',
              desc: 'Generate README files, auto summaries, and onboarding guides from your code.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="relative rounded-[20px] p-6 transition-all duration-300 group cursor-default"
              style={{
                background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 20px rgba(255,255,255,0.05), 0 8px 16px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              {/* Icon */}
              <div
                className="w-[42px] h-[42px] rounded-2xl flex items-center justify-center text-black mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{ background: '#ffffff' }}
              >
                {card.icon}
              </div>

              {/* Title */}
              <h3 className="text-[15px] font-semibold text-gray-100 mb-2.5">{card.title}</h3>

              {/* Description */}
              <p className="text-[14px] text-gray-500/90 leading-[1.6]">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
