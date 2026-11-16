import { normalizeEmail } from './validation';
import { AuthFailure, type AccountCodeType, type AccountCredentials, type StoredSession } from './types';
import type { AuthHttpTransport } from './transport';
import type { SessionManager } from './session';

type AccountTransport = Pick<AuthHttpTransport, 'signIn' | 'signUp' | 'sendCode' | 'verifyCode'
  | 'linkEmail' | 'accountProfile' | 'saveProfile' | 'updatePassword' | 'logout'>;

function requireIdentity(expected: string, received: string): void {
  if (expected !== received) throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' });
}

/** Only the session manager can persist a token. A recovery proof stays in memory and never becomes the app session. */
export function createAccountService(auth: AccountTransport, session: SessionManager) {
  let proof: { scope: AbortSignal; session: StoredSession; generation: number; kind: 'link' | 'recovery' } | undefined;
  const run = session.runAccountOperation.bind(session);
  return {
    signIn: (credentials: AccountCredentials) => run(async ({ adopt }) => {
      await adopt(await auth.signIn(credentials), 'sign-in');
    }),
    signUp: (input: AccountCredentials & { displayName: string }) => run(() => auth.signUp(input)),
    sendCode: (email: string, type: 'signup' | 'recovery') => run(() => auth.sendCode(email, type)),
    linkEmail: (email: string) => run(async ({ requireSession }) => {
      const current = await requireSession();
      if (!current.user.isGuest) throw new AuthFailure({ messageKey: 'VERSION_CONFLICT' });
      const updated = await auth.linkEmail(current.accessToken, email);
      requireIdentity(current.user.id, updated.id);
      if (!updated.isGuest) throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' });
    }),
    verifyCode: (email: string, code: string, kind: AccountCodeType, scope: AbortSignal) => run(async context => {
      const previous = kind === 'email_change' ? await context.requireSession() : undefined;
      if (previous && !previous.user.isGuest) throw new AuthFailure({ messageKey: 'VERSION_CONFLICT' });
      const verified = await auth.verifyCode(email, code, kind);
      context.assertCurrent();
      if (previous) {
        requireIdentity(previous.user.id, verified.user.id);
        await context.adopt(verified, 'link');
      } else if (kind === 'signup') {
        await context.adopt(verified, 'sign-in');
      }
      if (kind === 'recovery' && scope.aborted) {
        await auth.logout(verified.accessToken).catch(() => undefined);
      } else if (kind !== 'signup' && !scope.aborted) {
        proof = { scope, session: verified, generation: session.getGeneration(), kind: previous ? 'link' : 'recovery' };
      }
    }),
    discardPasswordProof: (scope: AbortSignal) => {
      if (proof?.scope !== scope) return;
      const discarded = proof;
      proof = undefined;
      if (discarded.kind === 'recovery') void auth.logout(discarded.session.accessToken).catch(() => undefined);
    },
    setPassword: (password: string, scope: AbortSignal) => run(async ({ assertCurrent, requireSession }) => {
      const challenge = proof;
      if (!challenge || scope.aborted || challenge.scope !== scope || challenge.generation !== session.getGeneration()) {
        throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
      }
      const authorized = challenge.kind === 'link' ? await requireSession() : challenge.session;
      requireIdentity(challenge.session.user.id, authorized.user.id);
      const updated = await auth.updatePassword(authorized.accessToken, password);
      requireIdentity(authorized.user.id, updated.id);
      if (proof === challenge) proof = undefined;
      if (challenge.kind === 'recovery') await auth.logout(authorized.accessToken).catch(() => undefined);
      assertCurrent();
    }),
    getProfile: () => run(async ({ requireSession }) => {
      const current = await requireSession();
      const profile = await auth.accountProfile(current.accessToken);
      requireIdentity(current.user.id, profile.user.id);
      return profile;
    }),
    saveProfile: (displayName: string) => run(async ({ requireSession, adopt }) => {
      const current = await requireSession();
      if (current.user.isGuest) throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
      const updated = await auth.saveProfile(current.accessToken, displayName);
      requireIdentity(current.user.id, updated.id);
      if (updated.displayName !== displayName.trim()) throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' });
      await adopt({ ...current, user: updated }, 'profile');
    }),
    changePassword: (currentPassword: string, password: string) => run(async ({ requireSession, assertCurrent }) => {
      const current = await requireSession();
      const profile = await auth.accountProfile(current.accessToken);
      requireIdentity(current.user.id, profile.user.id);
      assertCurrent();
      // Verify with the provider even on GoTrue versions that ignore current_password.
      const fresh = await auth.signIn({ email: normalizeEmail(profile.email), password: currentPassword });
      try {
        requireIdentity(current.user.id, fresh.user.id);
        assertCurrent();
        const updated = await auth.updatePassword(current.accessToken, password, currentPassword);
        requireIdentity(current.user.id, updated.id);
      } finally {
        await auth.logout(fresh.accessToken).catch(() => undefined);
      }
    }),
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
