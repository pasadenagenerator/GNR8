import { StackiDraftError } from '../stacki/stacki-draft-contract';
import { AstroBuildExportProofError } from '../output-adapters/astro-static-site-build-export-proof';
import { AstroWorkspacePreparationError } from '../output-adapters/astro-static-site-workspace-preparation';

export type PreparationPhase = 'source' | 'checkpoint' | 'baseline' | 'asset_plan' | 'assets' | 'export' | 'reservation' | 'build' | 'storage';

/** Only internal codes cross into UI/worker logs. Never expose provider text,
 * command output, URLs, contact data, paths or nested exception messages. */
export function publicationFailureCode(error:unknown):string {
 if (!(error instanceof Error)) return 'standalone_preparation_failed';
 if (/^standalone_[a-z0-9_]{1,100}$/.test(error.message)) return error.message;
 if (error instanceof StackiDraftError && /^STACKI_[A-Z0-9_]{1,100}$/.test(error.code)) return 'standalone_'+error.code.toLowerCase();
 if (error instanceof AstroBuildExportProofError && /^[a-z_]{1,60}$/.test(error.code)) return 'standalone_build_'+error.code;
 if (error instanceof AstroWorkspacePreparationError && /^[a-z_]{1,60}$/.test(error.code)) return 'standalone_workspace_'+error.code;
 if (['runtime_artifact_context_unavailable','runtime_artifact_binding_incomplete'].includes(error.message)) return 'standalone_'+error.message;
 for (const prefix of ['standalone_external_loaded_dependency','standalone_missing_dependency']) {
  if (error.message.startsWith(prefix+':')) return prefix;
 }
 return 'standalone_preparation_failed';
}

export class StandalonePreparationError extends Error {
 constructor(readonly phase:PreparationPhase,cause:unknown) {
  const code=publicationFailureCode(cause);
  super(code==='standalone_preparation_failed'?`standalone_preparation_${phase}_failed`:code,{cause});
  this.name='StandalonePreparationError';
 }
}
