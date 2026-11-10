import { nearbyFixture, scoredResultFixture } from '../fixtures/result/dishResultFixtures';
import { nearbyDistance, nearbyPlaces } from '../../src/features/result/services/nearbyPresentation';

test('nearby public projection drops invalid IDs, duplicates, invalid coordinates and private fields', () => {
  const state = nearbyFixture(scoredResultFixture(), 'ready'), place = state.places[0]!;
  const dirty = { ...place, latitude: 95, longitude: 200, distanceM: -1, rawBallots: 'private' };
  const output = nearbyPlaces({ ...state, places: [dirty, dirty, { ...place, id: '' }] });
  expect(output).toHaveLength(1); expect(output[0]).toMatchObject({ latitude: null, longitude: null, distanceM: null });
  expect(output[0]).not.toHaveProperty('rawBallots'); expect(nearbyDistance(null)).toBeNull(); expect(nearbyDistance(600)).toBe('600 m');
});
test('unmarked old places do not become current data during initial loading/error', () => {
  const state = nearbyFixture(scoredResultFixture(), 'ready');
  expect(nearbyPlaces({ ...state, status: 'error' })).toEqual([]);
  expect(nearbyPlaces({ ...state, status: 'loading' })).toEqual([]);
  expect(nearbyPlaces({ ...state, status: 'error', cached: true })).toHaveLength(1);
});
