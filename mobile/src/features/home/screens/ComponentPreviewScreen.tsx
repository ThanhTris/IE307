import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import {
  AppButton,
  AppHeader,
  AvatarRow,
  Chip,
  ContextSummary,
  DishCard,
  FormField,
  RoomCode,
  SheetDialog,
  StatusNotice,
  type VoteValue,
} from '../../../shared/ui';

type Props = { onBack: () => void };

const previewDish = {
  id: 'dish_preview_01',
  name: 'Phở bò tái nạm',
  description: 'Món nước nóng, dễ chia sẻ trong bữa trưa.',
  tags: ['Món nước', 'Việt Nam'],
  priceLabel: '~45k–65k / phần',
  venueLabel: 'Phở Phú Vương',
};

export function ComponentPreviewScreen({ onBack }: Props) {
  const { colors } = useShellTheme();
  const [roomCode, setRoomCode] = useState('GCD234');
  const [selectedChip, setSelectedChip] = useState('Món nước');
  const [vote, setVote] = useState<VoteValue>();
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Component mẫu" onPressBrand={onBack} colors={colors} inboxBadge={1} />
      <ScrollView contentContainerStyle={styles.content}>
        <StatusNotice
          title="GM-05 · Component dùng chung"
          message="Màn này là ví dụ ghép từ tokens và component thật. Dữ liệu món được hard-code làm fixture, chưa gọi API."
          tone="info"
          colors={colors}
        />
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tạo bối cảnh</Text>
          <FormField label="Tên phòng" value="Bữa trưa vui vẻ" onChangeText={() => undefined} helperText="FormField hỗ trợ nhãn, hint, lỗi và font scaling." colors={colors} />
          <View style={styles.chips}>
            {['Món nước', 'Cơm', 'Ăn vặt'].map(label => <Chip key={label} label={label} selected={label === selectedChip} onPress={() => setSelectedChip(label)} colors={colors} />)}
          </View>
          <ContextSummary anchorName="Hồ Con Rùa" mealLabel="Bữa trưa" desiredAtLabel="12:00 hôm nay" radiusLabel="1,5 km" serviceModeLabel="Ăn tại quán" colors={colors} />
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mời nhóm</Text>
          <RoomCode code={roomCode} onCopy={() => setSheetVisible(true)} colors={colors} />
          <AvatarRow items={[{ id: 'minh', label: 'Minh', initial: 'M', status: 'online' }, { id: 'tuan', label: 'Tuấn', initial: 'T', status: 'idle' }]} onAdd={() => setSheetVisible(true)} colors={colors} />
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Thẻ món và lựa chọn</Text>
          <DishCard dish={previewDish} selectedVote={vote} onVote={setVote} colors={colors} />
        </View>
        <AppButton label="Mở sheet/dialog mẫu" variant="secondary" onPress={() => setSheetVisible(true)} colors={colors} />
        <AppButton label="Quay lại shell" variant="quiet" onPress={onBack} colors={colors} />
        <Text style={[styles.caption, { color: colors.muted }]}>Mock fixture · GM-05.1 · code phòng theo contract 6 ký tự</Text>
      </ScrollView>
      <SheetDialog visible={sheetVisible} title="Chia sẻ phòng" onClose={() => setSheetVisible(false)} colors={colors}>
        <FormField label="Mã phòng" value={roomCode} onChangeText={value => setRoomCode(value.toUpperCase().slice(0, 6))} helperText="Mã server có 6 ký tự; input chỉ là mock preview." colors={colors} />
        <AppButton label="Xác nhận" onPress={() => setSheetVisible(false)} colors={colors} />
      </SheetDialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  caption: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
