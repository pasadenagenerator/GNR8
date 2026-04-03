'use client'

import type { ReactNode } from 'react'

import WorkspaceStateSync from '../_components/workspace/WorkspaceStateSync'

type Props = {
  children: ReactNode
}

export default function ClientSegmentLayout(props: Props) {
  return (
    <>
      <WorkspaceStateSync />
      {props.children}
    </>
  )
}
