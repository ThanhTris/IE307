/** Retryable stop entry point for the GM-22 owned Auth+REST QA project. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const python=process.platform==='win32'?'python':'python3';
const result=spawnSync(python,['scripts/gm22_admission_check.py','--cleanup'],{cwd:root,encoding:'utf8',stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
