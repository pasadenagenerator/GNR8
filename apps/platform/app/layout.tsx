import type { ReactNode } from 'react'

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