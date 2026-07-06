'use client'

interface SlidePanelProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}

export default function SlidePanel({ title, subtitle, onClose, children }: SlidePanelProps) {
  return (
    <>
      <div className="slide-panel-backdrop" onClick={onClose} />
      <div className="slide-panel">
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">{title}</h2>
              {subtitle && <p className="text-text-secondary">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}
