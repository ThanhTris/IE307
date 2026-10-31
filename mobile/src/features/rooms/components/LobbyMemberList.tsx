import { StyleSheet, Text, View } from 'react-native';
import type { RoomSnapshot } from '../../../data/api';
import { AvatarRow, type Palette } from '../../../shared/ui';

export interface LobbyMemberListProps {
  snapshot: RoomSnapshot;
  viewerUserId?: string;
  members: {
    id: string;
    label: string;
    initial: string;
    status: 'online' | 'idle';
  }[];
  colors: Palette;
}

export function LobbyMemberList({ snapshot, viewerUserId, members, colors }: LobbyMemberListProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Thành viên · {snapshot.members.length}/8</Text>
      <AvatarRow items={members} colors={colors} />
      {snapshot.members.map(member => (
        <View key={member.userId} style={[styles.memberRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.bodyStrong, { color: colors.text }]}>
            {member.displayName}
            {member.userId === snapshot.hostUserId ? ' · Host' : ''}
            {member.userId === viewerUserId ? ' · Bạn' : ''}
          </Text>
          <Text style={[styles.helper, { color: member.ready ? colors.green : colors.warning }]}>
            {member.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 9 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  memberRow: { minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  helper: { fontSize: 12, lineHeight: 18 },
});
