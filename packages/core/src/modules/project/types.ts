export type Project = {
  id: string
  orgId: string
  name: string
  slug: string
  createdAt: string
  deletedAt: string | null
}

export type CreateProjectInput = {
  actorUserId: string
  orgId: string
  name: string
  slug: string
}