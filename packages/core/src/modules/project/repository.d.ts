import type { Role } from '../authorization';
import type { Project } from './types';
export interface ProjectTransaction {
    createProject(input: {
        orgId: string;
        name: string;
        slug: string;
    }): Promise<Project>;
}
export interface ProjectRepository {
    withTransaction<T>(fn: (tx: ProjectTransaction) => Promise<T>): Promise<T>;
}
export interface MembershipRepository {
    getActorRoleInOrg(input: {
        tx: ProjectTransaction;
        actorUserId: string;
        orgId: string;
    }): Promise<Role | null>;
}
//# sourceMappingURL=repository.d.ts.map