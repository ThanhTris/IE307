import { evaluateEligibility } from '../mobile/src/domain/eligibility/index.ts';
import { suite, datasets, adaptLegacy, fixturePolicy, extraCases, timezoneCases } from '../mobile/tests/helpers/eligibilityFixtures.mjs';
// Test fixture adapter only; original GM-04 artifacts are not rewritten.
const legacy = suite.cases.map(c => ({
  id: c.id, bundle: adaptLegacy(datasets[c.datasetKey]), input: c.input,
  evaluatedAt: c.evaluatedAt, policy: fixturePolicy,
  expectedEligibleOfferingIds: c.expected.eligibleOfferingIds, actual: evaluateEligibility(adaptLegacy(datasets[c.datasetKey]), c.input, c.evaluatedAt, fixturePolicy),
}));
const extra = [...extraCases(), ...timezoneCases()].map(c => ({ ...c, actual: evaluateEligibility(c.bundle, c.input, c.evaluatedAt, c.policy) }));
process.stdout.write(JSON.stringify([...legacy, ...extra]));
