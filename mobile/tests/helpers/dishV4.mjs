import { registerHooks } from 'node:module';
const hooks = registerHooks({ resolve(specifier, context, next) {
  return next(specifier === './index' && context.parentURL?.endsWith('/dishPolicyV4.ts') ? './index.ts' : specifier, context);
} });
export const domain = await import('../../src/domain/decision/dishPolicyV4.ts');
hooks.deregister();
