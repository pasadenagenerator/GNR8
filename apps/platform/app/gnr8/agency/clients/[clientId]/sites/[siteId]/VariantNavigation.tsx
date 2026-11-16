'use client'

import { createContext, useContext, useOptimistic, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const VariantNavigationContext = createContext<{
  pending: boolean
  selected: string
  select: (id: string) => void
} | null>(null)

export function VariantNavigation(props: { selectedVariantId: string | null; agencyId: string; children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useOptimistic(props.selectedVariantId ?? '')
  function select(id: string) {
    if (pending || id === selected || !pathname) return
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('agency', props.agencyId)
    if (id) params.set('variant', id)
    else params.delete('variant')
    startTransition(() => {
      setSelected(id)
      // replace already loads the new server tree. A separate refresh targets
      // the still-current route and does not acknowledge the selected version.
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }
  return <VariantNavigationContext.Provider value={{ pending, selected, select }}>
    {props.children}
  </VariantNavigationContext.Provider>
}

export function useVariantNavigation() {
  return useContext(VariantNavigationContext)
}

// Server and initial browser render must not depend on machine locale/timezone.
export function formatVariantTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Datum ni na voljo' : date.toISOString().replace('T', ' ').replace('.000Z', ' UTC')
}
