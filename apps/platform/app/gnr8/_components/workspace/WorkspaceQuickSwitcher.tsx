'use client'

import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { useId } from 'react'

import { setWorkspaceState, type WorkspaceState } from '@/src/workspace/workspace-state'

export type WorkspaceQuickSwitchOption = {
  value: string
  label: string
  href: string
}

type Props = {
  label: string
  currentValue: string
  options: WorkspaceQuickSwitchOption[]
  persistStateOnChange?: Partial<WorkspaceState>
  persistStateValueKey?: 'activeAgencyId' | 'activeClientId'
}

function labelStyle(): CSSProperties {
  return {
    display: 'grid',
    gap: 6,
    width: 'fit-content',
    color: '#334155',
    fontSize: 12,
    fontWeight: 600,
  }
}

function selectStyle(): CSSProperties {
  return {
    minWidth: 220,
    maxWidth: 340,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    padding: '7px 10px',
    fontSize: 13,
  }
}

export default function WorkspaceQuickSwitcher(props: Props) {
  const router = useRouter()
  const selectId = useId()

  function buildPersistedState(nextValue: string): Partial<WorkspaceState> | null {
    const partial: Partial<WorkspaceState> = { ...(props.persistStateOnChange ?? {}) }
    if (props.persistStateValueKey) {
      partial[props.persistStateValueKey] = nextValue
    }
    if (!Object.keys(partial).length) return null
    return partial
  }

  function handleChange(nextValue: string): void {
    if (!nextValue || nextValue === props.currentValue) return
    const nextOption = props.options.find((option) => option.value === nextValue)
    if (!nextOption) return

    const persistedState = buildPersistedState(nextValue)
    if (persistedState) {
      setWorkspaceState(persistedState)
    }

    router.push(nextOption.href)
  }

  return (
    <label htmlFor={selectId} style={labelStyle()}>
      <span>{props.label}</span>
      <select
        id={selectId}
        value={props.currentValue}
        onChange={(event) => handleChange(event.currentTarget.value)}
        style={selectStyle()}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
