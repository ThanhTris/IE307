import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  ApiClient,
  MealSlot,
  RoomContext,
} from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { AppButton, DishCard, DishCount, InsufficientDishes, SheetDialog, StatusNotice } from '../../../shared/ui';
import {
  dishPrice,
  mealLabels,
  type GM24Scenario,
} from '../services/roomSetup';
import {
  useDiscoveryContext,
  type ContextScenario,
  type EnvironmentMode,
} from '../hooks/useDiscoveryContext';
import { SetupCheckboxRow } from '../components/SetupCheckboxRow';
import { SetupChoice } from '../components/SetupChoice';
import { SetupTimeMode } from '../components/SetupTimeMode';
import { SetupScheduleSummary } from '../components/SetupScheduleSummary';
import { budgetOptions, mealOptions } from '../services/dishSetup';

export type { ContextScenario, EnvironmentMode };

export interface DiscoveryContextScreenProps {
  apiClient?: ApiClient;
  initialScenario?: ContextScenario;
  initialEnvironmentMode?: EnvironmentMode;
  onSaveContext?: (context: Partial<RoomContext> & { dishCount?: number }) => void;
  onBack?: () => void;
}

export function DiscoveryContextScreen({
  apiClient,
  initialScenario = 'exact_20_lunch',
  initialEnvironmentMode = 'mock',
  onSaveContext,
  onBack,
}: DiscoveryContextScreenProps) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();

  const {
    envMode,
    setEnvMode,
    scenario,
    setScenario,
    realApiUrl,
    mealSlot,
    setMealSlot,
    dishCount,
    setDishCount,
    timeMode,
    setTimeMode,
    desiredAt,
    setDesiredAt,
    budget,
    setBudget,
    avoidRecent,
    setAvoidRecent,
    inviteeIds,
    setInviteeIds,
    currentNow,
    isDesiredTimePassed,
    adjustToValidTime,
    preview,
    previewLoading,
    previewError,
    loadPreview,
    generation,
    shortage,
    confirmReduction,
    dismissShortage,
    confirmed,
    setConfirmed,
    receipt,
    saveDraft,
  } = useDiscoveryContext({
    apiClient,
    initialScenario,
    initialEnvironmentMode,
    onSaveContext,
  });

  const [friendsSheetOpen, setFriendsSheetOpen] = useState(false);
  const sampleFriends = [
    { id: 'fr_linh', name: 'Linh' },
    { id: 'fr_nam', name: 'Nam' },
    { id: 'fr_minh', name: 'Minh' },
  ];

  const heading = (title: string) => (
    <Text accessibilityRole="header" style={[styles.sectionHeading, { color: colors.text }, textStyle(700)]}>
      {title}
    </Text>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Bar */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.backBtnText, { color: colors.text }, textStyle(600)]}>← Quay lại</Text>
          </Pressable>
          <Text accessibilityRole="header" style={[styles.headerTitle, { color: colors.text }, textStyle(700)]}>
            Thiết lập phòng & Xem trước món
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }, textStyle(400)]}>
            GM-24 · Khởi tạo danh sách món dish-only (10–20 món) · Không dùng vị trí hay quán ăn
          </Text>
        </View>

        {/* Environment & Scenario Controls */}
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text accessibilityRole="header" style={[styles.panelTitle, { color: colors.text }, textStyle(700)]}>
            ⚙️ Môi trường dữ liệu & API
          </Text>

          {/* Mode Switcher */}
          <View style={styles.modeSwitcher}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="🧪 Môi trường kịch bản (Mock)"
              onPress={() => setEnvMode('mock')}
              style={[
                styles.modeButton,
                {
                  backgroundColor: envMode === 'mock' ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  { color: envMode === 'mock' ? colors.onPrimary : colors.text },
                  textStyle(600),
                ]}
              >
                🧪 Kịch bản thử nghiệm (Mock)
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="🌐 Máy chủ thật (Live Supabase API)"
              onPress={() => setEnvMode('real_api')}
              style={[
                styles.modeButton,
                {
                  backgroundColor: envMode === 'real_api' ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  { color: envMode === 'real_api' ? colors.onPrimary : colors.text },
                  textStyle(600),
                ]}
              >
                🌐 Máy chủ thật (Live API)
              </Text>
            </Pressable>
          </View>

          {/* Mock Scenarios */}
          {envMode === 'mock' ? (
            <View style={styles.scenarioGroup}>
              <Text style={[styles.subLabel, { color: colors.muted }, textStyle(500)]}>
                Chọn tình huống thử nghiệm GM-24:
              </Text>
              <View style={styles.chipRow}>
                {[
                  { id: 'exact_20_lunch', label: '20 món · Bữa trưa' },
                  { id: 'shortage_15_lunch', label: 'Thiếu món: Có 15 / Chọn 20' },
                  { id: 'shortage_7_dinner', label: 'Thiếu món: Có 7 / Chọn 10' },
                  { id: 'server_offline', label: 'Mất kết nối / Ngoại tuyến' },
                  { id: 'slow_response', label: 'Phản hồi chậm' },
                  { id: 'desired_time_passed', label: 'Giờ ăn quá khứ' },
                ].map(item => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    onPress={() => setScenario(item.id as GM24Scenario)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: scenario === item.id ? colors.warm : colors.surface,
                        borderColor: scenario === item.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: scenario === item.id ? colors.primary : colors.text },
                        textStyle(scenario === item.id ? 700 : 400),
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.liveApiBox}>
              <Text style={[styles.liveText, { color: colors.text }, textStyle(500)]}>
                Supabase URL: {realApiUrl || '(Chưa cấu hình EXPO_PUBLIC_SUPABASE_URL)'}
              </Text>
              <Text style={[styles.liveText, { color: colors.muted }, textStyle(400)]}>
                Endpoint: POST /rest/v1/rpc/preview_dish_pool · Phiên bản: dish-catalogue/roadmap-v2/GM-18.2
              </Text>
            </View>
          )}
        </View>

        {/* 1. Buổi ăn */}
        <View style={styles.section}>
          {heading('🍽️ Buổi ăn')}
          <View style={styles.choiceGrid}>
            {mealOptions.map(item => (
              <SetupChoice
                key={item.id}
                label={item.label}
                icon={item.icon}
                stacked
                selected={mealSlot === item.id}
                onPress={() => setMealSlot(item.id)}
              />
            ))}
          </View>
        </View>

        {/* 2. Thời gian ăn */}
        <View style={styles.section}>
          {heading('⏰ Thời gian')}
          <SetupTimeMode
            scheduled={timeMode === 'scheduled'}
            onNow={() => setTimeMode('now')}
            onSchedule={() => setTimeMode('scheduled')}
          />

          {timeMode === 'scheduled' && desiredAt && (
            <View style={styles.scheduleBox}>
              <SetupScheduleSummary value={desiredAt} onEdit={() => {}} />

              {/* Quick time adjustment buttons */}
              <View style={styles.timeQuickRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Thêm 15 phút"
                  onPress={() => {
                    const current = Date.parse(desiredAt) || currentNow;
                    setDesiredAt(new Date(current + 15 * 60 * 1000).toISOString());
                  }}
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }, textStyle(500)]}>+15 phút</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Thêm 1 giờ"
                  onPress={() => {
                    const current = Date.parse(desiredAt) || currentNow;
                    setDesiredAt(new Date(current + 60 * 60 * 1000).toISOString());
                  }}
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }, textStyle(500)]}>+1 giờ</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quá khứ (-1 giờ)"
                  onPress={() => {
                    setDesiredAt(new Date(currentNow - 60 * 60 * 1000).toISOString());
                  }}
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }, textStyle(500)]}>Quá khứ (-1 giờ)</Text>
                </Pressable>
              </View>

              {/* Past time warning */}
              {isDesiredTimePassed && (
                <View style={styles.warningBox}>
                  <StatusNotice
                    title="DESIRED_TIME_PASSED: Giờ ăn đã qua"
                    message="Thời gian ăn đã qua so với giờ máy chủ. Hãy chọn giờ mới trong tương lai để tiếp tục."
                    tone="error"
                    colors={colors}
                  />
                  <AppButton
                    label="Điều chỉnh thành giờ hợp lệ (+15 phút từ giờ máy chủ)"
                    onPress={adjustToValidTime}
                    colors={colors}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {/* 3. Số món để lựa chọn · 10–20 (Figma 451:13066, 451:13189) */}
        <View style={styles.section}>
          {heading('🔢 Số món để lựa chọn · 10–20')}
          <DishCount
            value={dishCount}
            onChange={setDishCount}
            colors={colors}
            layout="inline"
          />
        </View>

        {/* 4. Ngân sách mỗi người */}
        <View style={styles.section}>
          {heading('💰 Ngân sách mỗi người')}
          <Text style={[styles.subNote, { color: colors.muted }, textStyle(400)]}>
            Không bắt buộc · ưu tiên mềm
          </Text>
          <View style={styles.choiceGrid}>
            {budgetOptions.map(item => (
              <SetupChoice
                key={item.id ?? 'none'}
                label={item.label}
                icon={item.icon}
                selected={budget === item.id}
                onPress={() => setBudget(item.id)}
              />
            ))}
          </View>
        </View>

        {/* 5. Ưu tiên món khác 3 bữa gần đây */}
        <View style={styles.section}>
          {heading('🔄 Lịch sử & Tránh lặp món')}
          <SetupCheckboxRow
            label="Ưu tiên món khác 3 bữa gần đây"
            checked={avoidRecent}
            helper="Ưu tiên mềm dựa trên lịch sử đã cấp quyền; không lọc cứng danh sách món."
            onPress={() => setAvoidRecent(!avoidRecent)}
          />
        </View>

        {/* 6. Rủ bạn ăn cùng */}
        <View style={styles.section}>
          {heading('👥 Rủ bạn ăn cùng')}
          <View style={styles.inviteeRow}>
            {sampleFriends.map(f => {
              const selected = inviteeIds.includes(f.id);
              return (
                <Pressable
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn bạn ${f.name}`}
                  onPress={() => {
                    if (selected) {
                      setInviteeIds(inviteeIds.filter(id => id !== f.id));
                    } else {
                      setInviteeIds([...inviteeIds, f.id]);
                    }
                  }}
                  style={[
                    styles.friendChip,
                    {
                      backgroundColor: selected ? colors.warm : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.friendChipText,
                      { color: selected ? colors.primary : colors.text },
                      textStyle(selected ? 600 : 400),
                    ]}
                  >
                    {selected ? `✓ ${f.name}` : `+ ${f.name}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 7. Xem trước danh sách món (Preview Pool) */}
        <View style={[styles.section, styles.previewSection]}>
          {heading('🔍 Danh sách món xem trước (Preview Pool)')}

          <AppButton
            label="🔍 Xem trước danh sách món (Preview Pool)"
            onPress={loadPreview}
            disabled={previewLoading || isDesiredTimePassed}
            loading={previewLoading}
            colors={colors}
          />

          {previewError && !shortage && (
            <StatusNotice
              title="Lỗi xem trước"
              message={previewError}
              tone="warning"
              colors={colors}
            />
          )}

          {/* Shortage Dialog / Banner (Figma 323:2664 & 1015:9957) */}
          {shortage && (
            <SheetDialog
              visible
              title="Số món phù hợp"
              onClose={dismissShortage}
              colors={colors}
            >
              <Text style={[{ color: colors.text, marginBottom: 12 }, textStyle(500)]}>
                {`Bạn đang chọn ${shortage.requested} món cho ${mealLabels[mealSlot]}.`}
              </Text>
              <InsufficientDishes
                mode={shortage.available >= 10 ? 'can-reduce' : 'below-minimum'}
                count={shortage.available}
                onReduce={shortage.available >= 10 ? confirmReduction : undefined}
                onEdit={dismissShortage}
                onBack={dismissShortage}
                colors={colors}
              />
            </SheetDialog>
          )}

          {/* Preview Pool Cards */}
          {preview && preview.length > 0 && (
            <View style={styles.previewResults}>
              <View style={[styles.previewBadge, { backgroundColor: colors.soft }]}>
                <Text style={[styles.previewBadgeText, { color: colors.text }, textStyle(600)]}>
                  ✓ Đã tìm thấy {preview.length} món phù hợp cho {mealLabels[mealSlot]} (Yêu cầu: {dishCount} món)
                </Text>
              </View>

              <View style={styles.dishList}>
                {preview.map(dish => (
                  <DishCard
                    key={dish.roundDishId || dish.dishId}
                    dish={{
                      id: dish.dishId,
                      name: dish.name,
                      description: dish.description ?? undefined,
                      priceLabel: dishPrice(dish),
                      tags: [
                        dish.temperature ? `Nhiệt độ: ${dish.temperature}` : '',
                        dish.origin ? `Vùng: ${dish.origin}` : '',
                      ].filter(Boolean),
                    }}
                    colors={colors}
                  />
                ))}
              </View>

              {/* Confirmation checkbox */}
              <SetupCheckboxRow
                label="Tôi xác nhận danh sách món và thiết lập phòng"
                checked={confirmed}
                onPress={() => setConfirmed(!confirmed)}
              />

              <AppButton
                label="Xác nhận bản nháp phòng"
                disabled={!confirmed || isDesiredTimePassed}
                onPress={saveDraft}
                colors={colors}
              />

              {receipt && (
                <StatusNotice
                  title="Bản nháp đã xác nhận"
                  message={receipt}
                  tone="success"
                  colors={colors}
                />
              )}
            </View>
          )}
        </View>

        {/* 8. Audit & Privacy Panel (Dish-only) */}
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text accessibilityRole="header" style={[styles.panelTitle, { color: colors.text }, textStyle(700)]}>
            🛡️ BẢO MẬT & QUYỀN RIÊNG TƯ (AUDIT)
          </Text>
          <View style={styles.auditList}>
            <Text style={[styles.auditItem, { color: colors.text }, textStyle(400)]}>
              • <Text style={textStyle(600)}>0 byte GPS:</Text> Không thu thập, không lưu tọa độ GPS, không dùng vị trí để lọc danh sách món ăn ban đầu.
            </Text>
            <Text style={[styles.auditItem, { color: colors.text }, textStyle(400)]}>
              • <Text style={textStyle(600)}>Dữ liệu phòng:</Text> Chỉ lưu buổi ăn, số món (10–20), giờ hẹn và ngân sách tham khảo.
            </Text>
            <Text style={[styles.auditItem, { color: colors.text }, textStyle(400)]}>
              • <Text style={textStyle(600)}>Quyền riêng tư:</Text> Lựa chọn cá nhân được mã hóa/bảo mật theo tài khoản, không hiển thị raw vote cho host hay thành viên khác.
            </Text>
            <Text style={[styles.auditItem, { color: colors.text }, textStyle(400)]}>
              • <Text style={textStyle(600)}>Tách biệt Places:</Text> Tìm quán ăn sau khi có kết quả thuộc phạm vi GM-30, không can thiệp vào phòng chọn món ban đầu.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 32,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 18,
    lineHeight: 26,
  },
  subNote: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -6,
  },
  panel: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  panelTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  modeSwitcher: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonText: {
    fontSize: 13,
    textAlign: 'center',
  },
  scenarioGroup: {
    gap: 8,
  },
  subLabel: {
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  liveApiBox: {
    gap: 4,
  },
  liveText: {
    fontSize: 13,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleBox: {
    gap: 12,
    marginTop: 4,
  },
  timeQuickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 13,
  },
  warningBox: {
    gap: 8,
  },
  inviteeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  friendChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  friendChipText: {
    fontSize: 14,
  },
  previewSection: {
    gap: 16,
  },
  previewResults: {
    gap: 16,
    marginTop: 8,
  },
  previewBadge: {
    padding: 12,
    borderRadius: 10,
  },
  previewBadgeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  dishList: {
    gap: 12,
  },
  auditList: {
    gap: 8,
  },
  auditItem: {
    fontSize: 13,
    lineHeight: 20,
  },
});
