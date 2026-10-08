import { routeIncomingLink } from '../domain/bootstrap/joinLink';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return routeIncomingLink(path);
}
