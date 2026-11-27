/** The container calls these Worker routes without an interactive Access session.
 * The Worker still requires its per-site CONTAINER_TOKEN for every request.
 */
export const STUDIO_INTERNAL_ACCESS_OVERRIDE = {
  behavior: 'public', path_pattern: '/studio/internal/*',
} as const;

export function exactStudioInternalOverride(value: unknown): boolean {
  return Array.isArray(value) && value.length === 1 &&
    value[0] !== null && typeof value[0] === 'object' &&
    !Array.isArray(value[0]) &&
    Object.keys(value[0]).sort().join(',') === 'behavior,path_pattern' &&
    value[0].behavior === STUDIO_INTERNAL_ACCESS_OVERRIDE.behavior &&
    value[0].path_pattern === STUDIO_INTERNAL_ACCESS_OVERRIDE.path_pattern;
}
