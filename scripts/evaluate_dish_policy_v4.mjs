/** Internal parity helper. Use synthetic inputs only; no input/seed logging. */
import { registerHooks } from 'node:module';
const hooks = registerHooks({ resolve(specifier, context, next) {
  return next(specifier === './index' && context.parentURL?.endsWith('/dishPolicyV4.ts') ? './index.ts' : specifier, context);
} });
const { decideDishSessionV4 } = await import('../mobile/src/domain/decision/dishPolicyV4.ts');
hooks.deregister();
let text = '';
for await (const chunk of process.stdin) text += chunk;
try { process.stdout.write(JSON.stringify(decideDishSessionV4(JSON.parse(text)))); }
catch (error) {
  if (!(error instanceof RangeError) && !(error instanceof SyntaxError)) throw error;
  process.stdout.write(JSON.stringify({ error: 'INVALID_INPUT' }));
}
