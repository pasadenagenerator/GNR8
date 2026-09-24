import type { ReactNode } from 'react'

import './gnr8-visual-system.css'

export const metadata = {
  title: 'GNR8 Platform',
  description: 'GNR8 Platform',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
