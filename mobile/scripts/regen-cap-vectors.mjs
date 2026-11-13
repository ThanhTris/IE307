// Regenerates the `cap-NN-*` vectors of tests/fixtures/decision-v4/cases.json for the removal limit of ADR-023
// (ceil(30%), at least 1). For N surviving dishes: `allowed` removes exactly cap dishes, `zero-remove` removes none,
// `plus-one` removes cap + 1 (rejected). Expected outputs come from the domain evaluator, so run it only after
// reviewing the limit itself in removalCapV4. Usage: node mobile/scripts/regen-cap-vectors.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { domain } from '../tests/helpers/dishV4.mjs';

const { decideDishSessionV4: decide, removalCapV4: cap } = domain;
const file = new URL('../../tests/fixtures/decision-v4/cases.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));
let changed = 0;
for (const row of data.cases) {
  const match = /^cap-(\d\d)-(allowed|zero-remove|plus-one)$/.exec(row.id);
  if (!match) continue;
  const n = Number(match[1]), kind = match[2], limit = cap(n);
  const dishes = Array.from({ length: n }, (_, i) => `d${String(i + 1).padStart(2, '0')}`);
  const removals = kind === 'allowed' ? limit : kind === 'plus-one' ? limit + 1 : 0;
  if (removals > n) throw new Error(`${row.id}: cannot remove ${removals} of ${n}`);
  const before = JSON.stringify(row);
  row.input.round2 = { b: Object.fromEntries(dishes.map((id, i) => [id, i < removals ? 'REMOVE' : 'KEEP'])) };
  row.expected = kind === 'plus-one' ? { error: 'INVALID_INPUT' } : decide(structuredClone(row.input));
  if (JSON.stringify(row) !== before) changed++;
}
writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`cap vectors regenerated, ${changed} changed`);
