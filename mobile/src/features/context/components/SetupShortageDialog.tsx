import { Text } from 'react-native';
import { InsufficientDishes, SheetDialog } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

export function SetupShortageDialog({ available, requested, onConfirmReduction, onEdit }: {
  available: number; requested: number; onConfirmReduction: () => void; onEdit: () => void;
}) {
  const { colors } = useShellTheme();
  return <SheetDialog visible title="Số món phù hợp" onClose={onEdit} colors={colors}>
    <Text style={{ color: colors.text }}>{`Bạn đang chọn ${requested} món.`}</Text>
    <InsufficientDishes mode={available >= 10 ? 'can-reduce' : 'below-minimum'} count={available}
      onReduce={available >= 10 ? onConfirmReduction : undefined} onEdit={onEdit} onBack={onEdit} colors={colors} />
  </SheetDialog>;
}
