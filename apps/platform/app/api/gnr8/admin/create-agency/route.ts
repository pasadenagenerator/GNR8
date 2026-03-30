import { NextRequest, NextResponse } from "next/server";

import { AgencyProvisioningError, createAgency } from "@/gnr8/agency/agency-provisioning-service";
import { getSupabaseServerClientMutating } from "@/src/auth/supabase-server-mutating";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";
import { getSuperadminPool } from "@/src/superadmin/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CreateAgencyBody = {
  name?: unknown;
  slug?: unknown;
  ownerEmail?: unknown;
  ownerName?: unknown;
};

function toTrimmed(value: unknown): string {
  return String(value ?? "").trim();
}

function mapError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "Internal server error";
  if (message === "Unauthorized") return { status: 401, message };
  if (message.startsWith("Forbidden")) return { status: 403, message };

  const lower = message.toLowerCase();
  if (
    lower.includes("is required") ||
    lower.includes("must be a valid email") ||
    lower.includes("must contain lowercase letters")
  ) {
    return { status: 400, message };
  }

  if (lower.includes("already exists")) {
    return { status: 409, message };
  }

  return { status: 500, message };
}

async function writeProvisionAudit(input: {
  actorUserId: string;
  agencyId: string;
  agencyOrganizationId: string;
  agencyName: string;
  agencySlug: string;
  ownerEmail: string;
}): Promise<void> {
  const pool = getSuperadminPool();
  const client = await pool.connect();
  try {
    await client.query(
      `
        insert into public.audit_logs (
          id,
          org_id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          metadata
        )
        values (
          gen_random_uuid()::text,
          $1::uuid,
          $2::uuid,
          'gnr8.agency.provisioned',
          'agency',
          $3::text,
          $4::jsonb
        )
      `,
      [
        input.agencyOrganizationId,
        input.actorUserId,
        input.agencyId,
        JSON.stringify({
          agency_name: input.agencyName,
          agency_slug: input.agencySlug,
          owner_email: input.ownerEmail,
        }),
      ],
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    const superadminUserId = await requireSuperadminUserId();

    // Explicitly use mutating request-scoped Supabase client in route handlers.
    const supabase = await getSupabaseServerClientMutating();
    const auth = await supabase.auth.getUser();
    const routeUserId = toTrimmed(auth.data.user?.id);
    if (auth.error || routeUserId !== superadminUserId) {
      throw new Error("Unauthorized");
    }

    const body = ((await request.json().catch(() => null)) ?? {}) as CreateAgencyBody;
    const name = toTrimmed(body.name);
    const slug = toTrimmed(body.slug).toLowerCase();
    const ownerEmail = toTrimmed(body.ownerEmail).toLowerCase();
    const ownerName = toTrimmed(body.ownerName) || null;

    const result = await createAgency({
      name,
      slug,
      ownerEmail,
      ownerName,
    });

    const timestamp = new Date().toISOString();

    console.info("[gnr8.superadmin.agency.create]", {
      actor_user_id: superadminUserId,
      timestamp,
      agency_id: result.agency.id,
      agency_slug: result.agency.slug,
      owner_email: result.owner.email,
    });

    try {
      await writeProvisionAudit({
        actorUserId: superadminUserId,
        agencyId: result.agency.id,
        agencyOrganizationId: result.agencyOrganization.id,
        agencyName: result.agency.name,
        agencySlug: result.agency.slug,
        ownerEmail: result.owner.email,
      });
    } catch (auditError) {
      const auditMessage = auditError instanceof Error ? auditError.message : String(auditError);
      console.warn("[gnr8.superadmin.agency.create.audit_failed]", {
        actor_user_id: superadminUserId,
        timestamp,
        agency_id: result.agency.id,
        error: auditMessage,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        agency: {
          id: result.agency.id,
          name: result.agency.name,
          slug: result.agency.slug,
        },
        owner: {
          email: result.owner.email,
          invite_status: result.owner.invite_status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const mapped = mapError(error);
    const isProvisioningError = error instanceof AgencyProvisioningError;
    return NextResponse.json(
      {
        ok: false,
        error: mapped.message,
        source: isProvisioningError ? "provisioning" : "route",
      },
      { status: mapped.status },
    );
  }
}
