import { useEffect, useState } from 'react'

const PROCESSING_STEPS = [
  { text: 'Parsing repository files', completed: true },
  { text: 'Building architecture graph', completed: true },
  { text: 'Generating embeddings', completed: true },
  { text: 'Detecting dependencies', completed: false, active: true },
  { text: 'Preparing AI insights', completed: false, active: false },
]

export function ProcessingScreen() {
  const [progress, setProgress] = useState(35)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return 35
        return prev + 0.3
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.03), transparent 60%)',
        }}
      />

      {/* Center Processing Card */}
      <div
        className="relative z-10 text-center px-8 py-10"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          width: '520px',
          maxWidth: '90vw',
        }}
      >
        {/* Spinner */}
        <div className="mb-6 relative inline-block">
          <div
            className="absolute inset-0 rounded-full blur-xl"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 60%)',
            }}
          />
          <div
            className="relative w-12 h-12 rounded-full"
            style={{
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#ffffff',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>

        <h2 className="text-[30px] font-semibold text-white mb-2 leading-tight">
          Analyzing repository architecture
        </h2>

        <p className="text-gray-500 text-base mb-6 leading-relaxed">
          Parsing files and detecting architectural patterns.
        </p>

        {/* Progress bar */}
        <div
          className="w-full rounded-full h-1.5 mb-6 overflow-hidden"
          style={{ background: '#1a1a1a' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #ffffff, #a3a3a3)',
            }}
          />
        </div>

        {/* Processing steps */}
        <div className="space-y-3 text-left">
          {PROCESSING_STEPS.map((step, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 text-sm"
            >
              {step.completed ? (
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-white text-black">
                  ✓
                </span>
              ) : step.active ? (
                <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                  <div
                    className="w-2 h-2 rounded-full bg-white"
                    style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                  />
                </div>
              ) : (
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs bg-gray-800 text-gray-600">
                  ○
                </span>
              )}
              <span
                className={
                  step.completed
                    ? 'text-gray-300'
                    : step.active
                    ? 'text-white'
                    : 'text-gray-600'
                }
              >
                {step.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}
