import { LiveResultRepository } from '../../src/features/result/services/resultRepository';
const cases: { name: string; input: unknown; expectedValid: boolean }[] = require('../fixtures/gm27/wire-schema-cases.json');
test.each(cases)('$name follows the raw wire contract', async ({ input, expectedValid }) => {
 const repo = new LiveResultRepository({ rpcCaller: async () => ({ ok: true, data: input }) });
 const result = await repo.getResult('schema-matrix-room');
 expect(result.ok).toBe(expectedValid);
 if (!expectedValid && !result.ok) expect(result.error.messageKey).toBe('MALFORMED_RESPONSE');
 repo.dispose();
});
