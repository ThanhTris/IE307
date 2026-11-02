import { useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { DishSetupFlow } from '../features/context/screens/DishSetupFlow';
import { createDishSetupCase, dishSetupCases } from './dishSetupCases';

export function DishSetupPreviewFlow({ onExit }: { onExit: () => void }) {
  const { colors } = useShellTheme();
  const [fixture, setFixture] = useState(() => ({ id: 'R01', revision: 0, flow: createDishSetupCase('R01') })), [open, setOpen] = useState(false);
  return <DishSetupFlow key={`${fixture.id}-${fixture.revision}`} {...fixture.flow} onExit={onExit} controls={locked => __DEV__ ? <View style={{ gap: 8 }}>
    <AppButton label={open ? 'Ẩn tình huống kiểm thử' : 'Tình huống kiểm thử'} variant="quiet" disabled={locked} colors={colors} onPress={() => setOpen(value => !value)} />
    {open ? <><Text style={{ color: colors.muted }}>Đổi tình huống sẽ xóa nháp/phòng mẫu hiện tại. Không gửi dữ liệu thật.</Text>{dishSetupCases.map(item => <AppButton key={item.id} label={`${item.id} · ${item.label}`} colors={colors} variant={fixture.id === item.id ? 'primary' : 'secondary'} disabled={locked} onPress={() => { const next = createDishSetupCase(item.id); setOpen(false); setFixture(value => ({ id: item.id, revision: value.revision + 1, flow: next })); }} />)}</> : null}
  </View> : null} />;
}
