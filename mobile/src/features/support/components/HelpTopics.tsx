import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { spacing, typography } from '../../../shared/theme/tokens';
import type { ThemeColors } from '../../../shared/theme/tokens';

/** Short answers that match the app's current rules. Update them when a rule changes. */
export const HELP_TOPICS: readonly (readonly [question: string, answer: string])[] = [
  ['Làm sao vào phòng của bạn bè?', 'Ở Trang chủ chọn Tham gia phòng, rồi nhập mã mời hoặc quét mã QR chủ phòng gửi.'],
  ['Sao chủ phòng chưa bắt đầu được?', 'Phòng cần ít nhất 2 người và mọi người đã chọn xong khẩu vị.'],
  ['Bình chọn thế nào?', 'Vòng 1, mỗi món chọn Muốn ăn, Ăn được hoặc Không ăn; món có người chọn Không ăn không thể thắng. Nếu chưa chốt được, vòng 2 bạn chọn bỏ bớt món không muốn.'],
  ['Quên mật khẩu thì làm sao?', 'Ở màn Đăng nhập bấm Quên mật khẩu?, nhập email rồi nhập mã được gửi tới email đó.'],
  ['Sao không thấy quán gần đây?', 'Quán chỉ được tìm sau khi nhóm đã chốt món. Bạn cần cho phép app dùng vị trí và có mạng.'],
];

export function HelpTopics({ colors }: { colors: ThemeColors }) {
  const [open, setOpen] = useState<string>();
  return <View>
    {HELP_TOPICS.map(([question, answer]) => {
      const expanded = open === question;
      return <View key={question} style={[styles.topic, { borderColor: colors.line }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={question} accessibilityState={{ expanded }}
          onPress={() => setOpen(expanded ? undefined : question)} style={styles.question}>
          <Text style={[typography.body, styles.questionText, { color: colors.text }]}>{question}</Text>
          <Text accessible={false} style={[typography.titleMedium, { color: colors.muted }]}>{expanded ? '−' : '+'}</Text>
        </Pressable>
        {expanded ? <Text style={[typography.body, styles.answer, { color: colors.muted }]}>{answer}</Text> : null}
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  topic: { borderTopWidth: StyleSheet.hairlineWidth },
  question: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  questionText: { flex: 1 },
  answer: { paddingBottom: spacing.md },
});
