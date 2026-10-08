import { router } from 'expo-router';
import { parseManualCode } from '../../../domain/bootstrap/joinLink';
import { SpikeButton, SpikeCard, SpikePage, SpikeText } from '../components/SpikePage';

export function JoinSpikeScreen({ code }: { code: unknown }) {
  const parsed = parseManualCode(code);
  return <SpikePage>
    <SpikeCard title={parsed ? 'Đã đọc mã thử nghiệm' : 'Link hoặc mã không hợp lệ'}>
      {parsed ? <SpikeText>Mã: {parsed}</SpikeText> : <SpikeText>Dùng link gi-cung-duoc://join?code=ABC234 hoặc nhập mã thủ công.</SpikeText>}
      <SpikeText>Đây là spike GM-02. Chưa đăng nhập, kiểm phòng hoặc gửi yêu cầu tham gia server. Mã không cấp quyền truy cập.</SpikeText>
      <SpikeButton title="Về màn kiểm tra" onPress={() => router.replace('/')} />
    </SpikeCard>
  </SpikePage>;
}
