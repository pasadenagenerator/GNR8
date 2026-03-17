export type AuditLogEvent = {
    id: string;
    orgId: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: unknown;
    createdAt: string;
};
export type ListOrgActivityInput = {
    actorUserId: string;
    orgId: string;
    action?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    cursor?: string | null;
    limit?: number;
};
export type ListOrgActivityOutput = {
    events: AuditLogEvent[];
    nextCursor: string | null;
};
//# sourceMappingURL=types.d.ts.map