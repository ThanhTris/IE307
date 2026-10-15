import type { InboxItem } from '../../data/api/contracts';

type InvitationReference = { invitationId: string; expiresAt?: string };

// GM-07's base room inbox fixture contains the inbox ID and event ID, but no
// invitation reference. Keep GM-14's explicit fixture mapping separate; never
// derive an invitation ID from eventId.
const mockReferencesByInboxId: Record<string, InvitationReference> = {
  inbox_01: { invitationId: 'room_invite_01', expiresAt: '2099-10-11T08:15:00Z' },
};

export function getInvitationReference(item: InboxItem): InvitationReference | undefined {
  const metadataId = item.metadata?.invitationId;
  const metadataExpiry = item.metadata?.expiresAt;
  const mockReference = mockReferencesByInboxId[item.id];
  const invitationId = typeof metadataId === 'string' && metadataId.trim()
    ? metadataId.trim()
    : mockReference?.invitationId;
  if (!invitationId) return undefined;
  const expiresAt = typeof metadataExpiry === 'string' ? metadataExpiry : mockReference?.expiresAt;
  return expiresAt ? { invitationId, expiresAt } : { invitationId };
}
