// Run when contact-submission.ts, contact limits/email validation, or the
// standalone delivery adapter changes. Tests compare this bundle byte-for-byte.
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
export async function bundleContactRuntime(){
 const result=await build({entryPoints:[fileURLToPath(new URL('./contact-runtime.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',target:'node22',minify:true,legalComments:'none',tsconfig:fileURLToPath(new URL('../../tsconfig.json',import.meta.url))});
 return Buffer.from(result.outputFiles[0].contents);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await writeFile(new URL('./templates/contact-runtime.mjs',import.meta.url),await bundleContactRuntime());
