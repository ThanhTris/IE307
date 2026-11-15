import { CONTAINER_MAX_WIDTH, CONTAINER_STYLE, DIALOG_MAX_WIDTH, FOCUSED_MAX_WIDTH } from '../../src/shared/ui/layout/ScreenContainer';

test('there is one container: full width up to the shared maximum, centred', () => {
  expect(CONTAINER_STYLE).toEqual({ width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center' });
  expect(FOCUSED_MAX_WIDTH).toBeLessThan(CONTAINER_MAX_WIDTH);
  expect(DIALOG_MAX_WIDTH).toBeLessThan(CONTAINER_MAX_WIDTH);
});
