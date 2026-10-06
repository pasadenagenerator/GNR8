import "server-only";

import { getSuperadminPool } from "@/src/superadmin/db";

export async function completeQueuedAstroGenerationAction(input: {
  actionId: string;
  ownershipSiteId: string;
  variantId: string;
  siteVersionId: string;
  strategy: string;
  label: string;
  diagnostics: string[];
}): Promise<void> {
  const client = await getSuperadminPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `
      insert into public.gnr8_site_variants (id, site_id, label, strategy, site_version_id)
      values ($1::uuid, $2::uuid, $3::text, $4::text, $5::uuid)
      on conflict (id) do update set
        label = excluded.label,
        strategy = excluded.strategy,
        site_version_id = excluded.site_version_id
      `,
      [input.variantId, input.ownershipSiteId, input.label, input.strategy, input.siteVersionId],
    );
    const updated = await client.query(
      `
      update public.gnr8_site_actions
      set status = 'completed', completed_at = now(), variant_id = $2::uuid,
          result_summary = $3::text, diagnostics = $4::jsonb
      where id = $1::uuid and site_id = $5::uuid and type = 'generate_redesign'
      returning id
      `,
      [
        input.actionId,
        input.variantId,
        `Astro redesign generated. Runtime version ${input.siteVersionId} is ready for exact-artifact review.`,
        JSON.stringify(input.diagnostics),
        input.ownershipSiteId,
      ],
    );
    if (!updated.rows[0]) throw new Error("astro_generation_action_scope_mismatch");
    await client.query("update public.sites set updated_at = now() where id = $1::uuid", [input.ownershipSiteId]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function failQueuedAstroGenerationAction(input: {
  actionId: string;
  ownershipSiteId: string;
  message: string;
}): Promise<void> {
  const client = await getSuperadminPool().connect();
  try {
    await client.query(
      `
      update public.gnr8_site_actions
      set status = 'failed', completed_at = now(), result_summary = $3::text, diagnostics = $4::jsonb
      where id = $1::uuid and site_id = $2::uuid and type = 'generate_redesign'
      `,
      [input.actionId, input.ownershipSiteId, `Astro generation failed: ${input.message}`, JSON.stringify([input.message])],
    );
  } finally {
    client.release();
  }
}
