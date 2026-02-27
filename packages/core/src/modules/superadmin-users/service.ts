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

    // explicit existence check (domain responsibility)
    const exists = await this.repo.orgExists({ orgId })
    if (!exists) {
      throw new NotFoundError('Org not found')
    }

    const users = await this.repo.listOrgUsers({ orgId })

    return { users }
  }
}