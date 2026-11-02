import { useState } from 'react';
import { useRouter } from 'expo-router';
import { DishSetupScreen } from '../../features/context/screens/DishSetupScreen';
import { ScheduleSheet } from '../../features/context/components/ScheduleSheet';
import { useDishSetupDraft } from '../../features/context/hooks/useDishSetupDraft';
import { emptyPreferences } from '../../features/context/services/dishSetup';
import { DishPreferencesScreen } from '../../features/preferences/screens/DishPreferencesScreen';
import { dishSetupCatalogue } from '../../bootstrap/dishSetupCatalogue';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { DishSetupFrame } from '../../features/context/components/DishSetupFrame';
import { AppButton, SheetDialog, StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';

export default function DishSetupRoute() {
  const router = useRouter(), live = useRoomRepository(), { colors } = useShellTheme();
  const { draft, dirty, change, reset } = useDishSetupDraft();
  const [notice, setNotice] = useState<string>(), [schedule, setSchedule] = useState<string>(), [discard, setDiscard] = useState(false);
  const [stage, setStage] = useState<'setup' | 'preferences'>('setup'), [preferences, setPreferences] = useState(emptyPreferences);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  if (live.mode === 'real') return <DishSetupFrame title="Thiết lập phòng" onBack={back} footer={null}><StatusNotice title="Chưa nhận adapter thiết lập mới" message="Màn mẫu không ghi dữ liệu vào phòng thật." colors={colors} /></DishSetupFrame>;
  return <>{stage === 'preferences' ? <DishPreferencesScreen preferences={preferences} catalogue={dishSetupCatalogue} onChange={setPreferences} onBack={() => setDiscard(true)} onSave={skip => { if (skip) setPreferences(emptyPreferences(preferences.historyConsent)); setNotice('Khẩu vị mẫu được giữ; chưa đồng bộ với phòng thật.'); }} notice={notice} /> : <DishSetupScreen draft={draft} onChange={change} onBack={() => dirty ? setDiscard(true) : back()} onSchedule={() => setSchedule(draft.desiredAt ?? new Date(Date.now() + 15 * 60000).toISOString())} onContinue={() => { setNotice(undefined); setStage('preferences'); }} notice={notice} />}
    {schedule ? <ScheduleSheet initial={schedule} now={Date.now} onClose={() => setSchedule(undefined)} onConfirm={desiredAt => { change({ desiredAt, timeMode: 'scheduled' }); setSchedule(undefined); }} /> : null}
    <SheetDialog visible={discard} title={stage === 'preferences' ? 'Bỏ thay đổi khẩu vị?' : 'Bỏ thiết lập phòng?'} colors={colors} onClose={() => setDiscard(false)}><StatusNotice title="Thay đổi chưa lưu sẽ bị mất." colors={colors} /><AppButton label="Bỏ thay đổi" colors={colors} onPress={() => { setDiscard(false); if (stage === 'preferences') { setPreferences(emptyPreferences(preferences.historyConsent)); setNotice(undefined); setStage('setup'); } else { reset(); back(); } }} /><AppButton label="Tiếp tục thiết lập" variant="secondary" colors={colors} onPress={() => setDiscard(false)} /></SheetDialog>
  </>;
}
