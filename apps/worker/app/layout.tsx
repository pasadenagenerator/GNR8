import type { ReactNode } from 'react'

export default function RootLayout(input: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>{input.children}</body>
    </html>
  )
}
