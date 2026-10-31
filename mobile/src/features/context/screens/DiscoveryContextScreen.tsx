import React from 'react';
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
  ServiceMode,
} from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { ContextSummary, StatusNotice } from '../../../shared/ui';
import { currentServerTime, localTime, parseBudget, parseLocalTime } from '../services/roomSetup';
import { ContextDraftFields } from '../components/ContextDraftFields';
import {
  useDiscoveryContext,
  type ContextScenario,
  type EnvironmentMode,
} from '../hooks/useDiscoveryContext';
import { EnvironmentAndScenarioPanel } from '../components/EnvironmentAndScenarioPanel';
import { AnchorPickerSection } from '../components/AnchorPickerSection';
import { ContextPreviewAndPrivacyCard } from '../components/ContextPreviewAndPrivacyCard';

export type { ContextScenario, EnvironmentMode };

export interface DiscoveryContextScreenProps {
  apiClient?: ApiClient;
  initialScenario?: ContextScenario;
  initialEnvironmentMode?: EnvironmentMode;
  onSaveContext?: (context: RoomContext) => void;
  onBack?: () => void;
}


const MEAL_SLOTS: { label: string; value: MealSlot }[] = [
  { label: 'Bữa sáng', value: 'breakfast' },
  { label: 'Bữa trưa', value: 'lunch' },
  { label: 'Bữa tối', value: 'dinner' },
  { label: 'Ăn vặt', value: 'snack' },
];
const SERVICE_MODES: { label: string; value: ServiceMode }[] = [
  { label: 'Ăn tại quán', value: 'dine_in' },
  { label: 'Mang về', value: 'takeaway' },
  { label: 'Giao hàng', value: 'delivery' },
];

export function DiscoveryContextScreen({
  apiClient,
  initialScenario = 'gps_grant_rua',
  initialEnvironmentMode = 'mock',
  onSaveContext,
  onBack,
}: DiscoveryContextScreenProps) {
  const { colors } = useShellTheme();
  const ctx = useDiscoveryContext({
    apiClient,
    initialScenario,
    initialEnvironmentMode,
    onSaveContext,
  });

  const {
    envMode,
    setEnvMode,
    scenario,
    setScenario,
    loading,
    serverError,
    realApiUrl,
    realClientStatus,
    liveAuth,
    serverTime,
    serverLoadedAt,
    anchors,
    preview,
    previewLoading,
    previewError,
    confirmed,
    locationState,
    radiusM,
    setRadiusM,
    budget,
    setBudget,
    avoidRecent,
    setAvoidRecent,
    mealSlot,
    setMealSlot,
    serviceMode,
    setServiceMode,
    timeMode,
    setTimeMode,
    timeState,
    setTimeState,
    dateText,
    setDateText,
    timeText,
    setTimeText,
    service,
    sanitizedContext,
    liveDesiredAtPast,
    draftInputError,
    canSaveContext,
    createLiveGuest,
    handleRetry,
    invalidateDraft,
    handleSelectAnchor,
    handleRefreshGps,
    handleToggleTimeMode,
    handleSetScheduledOffsetHours,
    handleConfirmPastTime,
    handleAdjustToValidNow,
    handleSaveContext,
    handlePreview,
    handleConfirmDraft,
    nextMealTime,
  } = ctx;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors?.background ?? '#F8F6F2' }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors?.text ?? '#1A202C' }]}>
            Bối cảnh & Vị trí phòng
          </Text>
          {onBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={onBack}
              style={styles.backBtn}
            >
              <Text style={{ color: colors?.primary ?? '#FF5A36', fontWeight: '700' }}>Quay lại</Text>
            </Pressable>
          )}
        </View>
        <Text style={[styles.caption, { color: colors?.muted ?? '#64748B' }]}>
          GM-24 · Foreground GPS gợi điểm công cộng · Không gửi GPS thô lên server
        </Text>

        <EnvironmentAndScenarioPanel
          envMode={envMode}
          setEnvMode={setEnvMode}
          scenario={scenario}
          setScenario={setScenario}
          realClientStatus={realClientStatus}
          realApiUrl={realApiUrl}
          serverError={serverError}
          hasLiveAuth={Boolean(liveAuth)}
          loading={loading}
          onCreateLiveGuest={() => { void createLiveGuest(); }}
          colors={colors}
        />

        {serverError && (
          <StatusNotice
            title="Lỗi tải dữ liệu khu vực"
            message={`Không thể kết nối máy chủ: ${serverError}. Bạn có thể thử lại hoặc tiếp tục chọn thủ công.`}
            tone="error"
            actionLabel="Thử lại kết nối"
            onAction={handleRetry}
            colors={colors}
          />
        )}

        {locationState.errorMessage && (
          <StatusNotice
            title={
              locationState.permission === 'denied'
                ? 'Quyền vị trí bị từ chối'
                : locationState.isOutsideCoverage
                ? 'Vị trí ngoài vùng hỗ trợ'
                : 'Thông báo định vị'
            }
            message={locationState.errorMessage}
            tone={locationState.isOutsideCoverage ? 'warning' : 'info'}
            colors={colors}
          />
        )}

        <AnchorPickerSection
          loading={loading}
          anchors={anchors}
          locationState={locationState}
          onRefreshGps={() => { void handleRefreshGps(); }}
          onSelectAnchor={handleSelectAnchor}
          colors={colors}
        />

        <ContextDraftFields
          draft={{ radiusM, mealSlot, serviceMode, budget: parseBudget(budget) ?? null, avoidRecent }}
          budgetText={budget}
          date={dateText}
          time={timeText}
          timeState={timeState}
          disabled={loading}
          timeMode={timeMode}
          serverNow={() => currentServerTime(serverTime, serverLoadedAt)}
          eatNowLabel="⚡ Ăn ngay (Buffer 15p)"
          onRadiusChange={value => { setRadiusM(value); invalidateDraft(); }}
          onDateChange={value => {
            setDateText(value);
            setTimeMode('scheduled');
            const next = parseLocalTime(`${value} ${timeText}`);
            if (next) setTimeState(service.resolveScheduledTime(next, new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(), false));
            invalidateDraft();
          }}
          onTimeChange={value => {
            setTimeText(value);
            setTimeMode('scheduled');
            const next = parseLocalTime(`${dateText} ${value}`);
            if (next) setTimeState(service.resolveScheduledTime(next, new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(), false));
            invalidateDraft();
          }}
          onEatNow={() => { handleToggleTimeMode('now'); invalidateDraft(); }}
          onTimeModeChange={mode => { handleToggleTimeMode(mode); invalidateDraft(); }}
          onMealSlotChange={value => {
            setMealSlot(value);
            const next = nextMealTime(value, currentServerTime(serverTime, serverLoadedAt));
            if (next) {
              setTimeState(service.resolveScheduledTime(next, new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(), false));
              setDateText(localTime(next).slice(0, 10));
              setTimeText(localTime(next).slice(11));
            }
            invalidateDraft();
          }}
          onServiceModeChange={value => { setServiceMode(value); invalidateDraft(); }}
          onBudgetChange={value => { setBudget(value); invalidateDraft(); }}
          onAvoidRecentChange={value => { setAvoidRecent(value); invalidateDraft(); }}
          onScheduledOffset={handleSetScheduledOffsetHours}
          onAdjustToValid={handleAdjustToValidNow}
          onConfirmPast={handleConfirmPastTime}
        />

        {sanitizedContext && (
          <ContextSummary
            anchorName={sanitizedContext.anchorName ?? 'Điểm công cộng'}
            mealLabel={
              MEAL_SLOTS.find((m) => m.value === sanitizedContext.mealSlot)?.label ??
              sanitizedContext.mealSlot
            }
            desiredAtLabel={new Date(sanitizedContext.desiredAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            radiusLabel={`${sanitizedContext.radiusM / 1000} km`}
            serviceModeLabel={
              SERVICE_MODES.find((s) => s.value === sanitizedContext.serviceMode)?.label
            }
            colors={colors}
          />
        )}

        <ContextPreviewAndPrivacyCard
          loading={loading}
          serverError={serverError}
          preview={preview}
          previewLoading={previewLoading}
          previewError={previewError}
          confirmed={confirmed}
          draftInputError={draftInputError}
          canSaveContext={canSaveContext}
          locationState={locationState}
          sanitizedContext={sanitizedContext}
          timeState={timeState}
          liveDesiredAtPast={liveDesiredAtPast}
          hasSaveCallback={Boolean(onSaveContext)}
          onConfirmDraft={handleConfirmDraft}
          onPreview={() => { void handlePreview(); }}
          onSaveContext={handleSaveContext}
          colors={colors}
        />
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: 20,
    gap: 16,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  backBtn: { padding: 8 },
  caption: { fontSize: 13, lineHeight: 18 },
});
