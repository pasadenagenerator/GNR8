-- ============================================
-- GNR8 LEGACY RETIREMENT MIGRATION
-- Retire ChaiBuilder schema artifact
-- ============================================

-- SAFETY: only drop if exists
drop table if exists public.builder_pages cascade;

-- Optional: comment for audit lineage
comment on schema public is
'GNR8 platform schema — ChaiBuilder retired 2026-03-26';
