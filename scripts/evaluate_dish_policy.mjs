/** Internal synthetic parity helper. Never logs input ballots or a server seed. */
import { registerHooks } from 'node:module';
const hooks=registerHooks({resolve(specifier,context,next) {
  return next(specifier==='./index'&&context.parentURL?.endsWith('/dishPolicy.ts')?'./index.ts':specifier,context);
}});
const {decideDishSession}=await import('../mobile/src/domain/decision/dishPolicy.ts');
hooks.deregister();
let input='';
for await(const chunk of process.stdin) input+=chunk;
process.stdout.write(JSON.stringify(decideDishSession(JSON.parse(input))));
