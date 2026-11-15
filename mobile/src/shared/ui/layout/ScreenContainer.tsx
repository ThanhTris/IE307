import type { ViewStyle } from 'react-native';

/**
 * The one content width of the app: every screen keeps its header content, its content and its footer inside the same
 * container. Full width on a phone; on a tablet or a wide window a column of at most this width, centred (auto side
 * margins), so nothing sticks out on one side. Change the numbers here to change the whole app.
 */
export const CONTAINER_MAX_WIDTH = 640;
/** Side padding of every screen's content; the header content lines up with it. */
export const CONTAINER_GUTTER = 24;
/** Space between a 48pt icon button's edge and its icon: the header pulls its buttons out by this much so icons sit on the gutter. */
export const ICON_BUTTON_INSET = 10;
/** Single-purpose onboarding screens (welcome, sign-in, tutorial, permissions) are drawn as a phone column and stay narrower. */
export const FOCUSED_MAX_WIDTH = 480;
/** Dialogs and sheets are three quarters of the container. */
export const DIALOG_MAX_WIDTH = CONTAINER_MAX_WIDTH * 0.75;

/** Style that makes a View the container (a constant, so memoised styles stay stable). */
export const CONTAINER_STYLE: ViewStyle = { width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center' };
export const FOCUSED_STYLE: ViewStyle = { width: '100%', maxWidth: FOCUSED_MAX_WIDTH, alignSelf: 'center' };
