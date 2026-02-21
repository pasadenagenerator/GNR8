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

export type DeleteProjectInput = {
  actorUserId: string
  orgId: string
  projectId: string
}

export type RestoreProjectInput = {
  actorUserId: string
  orgId: string
  projectId: string
}

export type ListProjectsInput = {
  actorUserId: string
  orgId: string
}