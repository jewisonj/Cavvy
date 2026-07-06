import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cavvy - Farm & Stable Management',
  description: 'Farm and stable management for AQHA breeding operations — horses, breeding, foaling, and lineage',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
