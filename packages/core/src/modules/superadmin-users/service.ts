import { DomainError, NotFoundError } from '../../service-contract'
import type { SuperadminUsersRepository } from './repository'
import type {
  ListSuperadminOrgUsersInput,
  ListSuperadminOrgUsersOutput,
} from './types'

export class SuperadminUsersService {
  constructor(private readonly repo: SuperadminUsersRepository) {}

  async listOrgUsers(
    input: ListSuperadminOrgUsersInput,
  ): Promise<ListSuperadminOrgUsersOutput> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) throw new DomainError('orgId is required')

    const users = await this.repo.listOrgUsers({ orgId })
    if (!users) throw new NotFoundError('Org not found')

    return { users }
  }
}