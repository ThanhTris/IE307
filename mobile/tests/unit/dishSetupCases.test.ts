import { casesForSetupStage, createDishSetupCase, dishSetupCases } from '../../src/bootstrap/dishSetupCases';
import { optionIds } from '../../src/features/preferences/services/dishPreferences';

test('all P01–P11 and R01–R15 can be selected through the QA fixture catalogue', () => {
  const ids = new Set(dishSetupCases.map(item => item.id));
  for (let i = 1; i <= 11; i++) expect(ids.has(`P${String(i).padStart(2, '0')}`)).toBe(true);
  for (let i = 1; i <= 15; i++) expect(ids.has(`R${String(i).padStart(2, '0')}`)).toBe(true);
});

test('QA cases follow the active screen and shared error fixtures stay in preferences', async () => {
  const setup = casesForSetupStage('setup').map(item => item.id), preferences = casesForSetupStage('preferences').map(item => item.id);
  expect(setup).toContain('R01'); expect(setup).not.toContain('P02'); expect(setup).not.toContain('taxonomy-empty');
  expect(preferences).toContain('P02'); expect(preferences).toContain('taxonomy-empty'); expect(preferences).not.toContain('R01');
  expect(casesForSetupStage('complete')).toEqual([]); expect(casesForSetupStage('closed')).toEqual([]);
  const fixture = createDishSetupCase('timeout', Date.parse('2028-01-01T00:00:00Z'), 'preferences');
  expect(fixture.initialStage).toBe('preferences'); expect((await fixture.gateway.read()).room?.state).toBe('LOBBY');
});
test.each(['min10', 'max20', 'shortage15', 'shortage7', 'P02', 'P03', 'P04', 'P07', 'P11'])('fixture %s uses own data and canonical IDs without a legacy anchor', async id => {
  const fixture = createDishSetupCase(id, Date.parse('2028-01-01T00:00:00Z'));
  const data = await fixture.gateway.read();
  expect(data.settings?.dishCount).toBeGreaterThanOrEqual(10);
  expect(data.settings?.dishCount).toBeLessThanOrEqual(20);
  expect(data.settings).not.toHaveProperty('anchorId');
  expect(data).not.toHaveProperty('members');
  if (data.ownRoomPreferences) {
    const available = new Set(data.catalogue.categories.flatMap(optionIds));
    for (const selected of data.ownRoomPreferences.categoryIds) expect(available.has(selected)).toBe(true);
  }
});
