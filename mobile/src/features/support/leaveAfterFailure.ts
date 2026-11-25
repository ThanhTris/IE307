import type { Href } from 'expo-router';
import { destinationFor, incidentFor, type FailureExit, type FailureScope } from '../../shared/errors/failure';
import { setIncident } from '../../shared/errors/incident';

type Router = { replace: (href: Href) => void };

/** Moves the person to where they can carry on, and leaves the reason there (with "Báo lỗi" when it fits). */
export function leaveAfterFailure(
  router: Router,
  exit: FailureExit,
  { screen, scope, isGuest }: { screen: string; scope: FailureScope; isGuest: boolean },
): void {
  const destination = destinationFor(exit.code, scope, { isGuest }) === 'signIn' ? 'signIn' : 'home';
  setIncident(incidentFor(exit, destination, screen));
  router.replace(destination === 'signIn' ? { pathname: '/account/[flow]', params: { flow: 'sign-in' } } : '/');
}
