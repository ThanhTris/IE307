import { useRef, useState } from 'react';
import { useRoomRepository } from '../../../bootstrap/RoomRepositoryProvider';
import type {
  RoomContext,
  RoomSnapshot,
  UserPreferences,
} from '../../../data/api/contracts';

export interface LogEntry {
  id: string;
  time: string;
  action: string;
  ok: boolean;
  message: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  cuisineIds: ['d7bf6ad7-596c-5ee0-bf45-ccedfcf6460b'], // Món Việt
  categoryIds: ['e69b5f45-580d-5ee3-9e43-360650b4c650'], // Cơm
  temperature: 'hot',
  flavor: {
    spicy: { present: false, intensity: 'none' },
    salty: { present: true, intensity: 'medium' },
    sweet: { present: true, intensity: 'low' },
    sour: { present: false, intensity: 'none' },
  },
  historyConsent: true,
};

export function useRoomFlowSandbox() {
  const live = useRoomRepository();
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [activeRoomCode, setActiveRoomCode] = useState<string>('');
  const [roomSnapshot, setRoomSnapshot] = useState<RoomSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logCounter = useRef(0);

  const addLog = (action: string, ok: boolean, message: string) => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setLogs(prev => [
      { id: `log-${++logCounter.current}`, time, action, ok, message },
      ...prev.slice(0, 24),
    ]);
  };

  const handleEnsureSession = async () => {
    setBusy(true);
    try {
      const ok = await live.ensureSession('Trang (Flow Check)');
      if (ok) {
        addLog('ensureSession', true, `Đã xác thực user: ${live.user?.displayName ?? live.repository.getCurrentUser()?.displayName}`);
      } else {
        addLog('ensureSession', false, 'Không tạo/khôi phục được phiên');
      }
    } catch (e: any) {
      addLog('ensureSession', false, e?.message ?? 'Lỗi không xác định');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRoom = async () => {
    setBusy(true);
    try {
      const disc = await live.repository.getDiscoveryContext();
      let anchorId = 'c0a80101-0000-0000-0000-000000000001';
      let desiredAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      if (disc.ok && disc.data.anchors.length > 0) {
        const first = disc.data.anchors[0];
        if (first) {
          anchorId = first.id;
        }
        desiredAt = new Date(Date.parse(disc.data.serverTime) + 30 * 60 * 1000).toISOString();
      }
      const context: RoomContext = {
        anchorId,
        radiusM: 2000,
        mealSlot: 'lunch',
        desiredAt,
        serviceMode: 'dine_in',
        budget: 60000,
        avoidRecent: false,
      };
      const res = await live.repository.createRoom({
        displayName: live.user?.displayName ?? 'Trang (Host)',
        context,
      });
      if (res.ok) {
        setActiveRoomId(res.data.roomId);
        setActiveRoomCode(res.data.code);
        addLog('createRoom', true, `Tạo phòng thành công: ${res.data.code} (ID: ${res.data.roomId.slice(0, 8)}...)`);
        const snap = await live.repository.getRoomSnapshot(res.data.roomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('createRoom', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('createRoom', false, e?.message ?? 'Lỗi tạo phòng');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!activeRoomCode) {
      addLog('joinRoom', false, 'Vui lòng nhập hoặc tạo mã phòng trước');
      return;
    }
    setBusy(true);
    try {
      const res = await live.repository.joinRoom({
        code: activeRoomCode,
        displayName: 'Tuấn (Member Test)',
      });
      if (res.ok) {
        setActiveRoomId(res.data.roomId);
        addLog('joinRoom', true, `Gia nhập thành công phòng ${res.data.code} (Version: ${res.data.version})`);
        const snap = await live.repository.getRoomSnapshot(res.data.roomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('joinRoom', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('joinRoom', false, e?.message ?? 'Lỗi vào phòng');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateContext = async () => {
    if (!activeRoomId || !roomSnapshot || !roomSnapshot.context) {
      addLog('updateContext', false, 'Chưa có phòng để cập nhật');
      return;
    }
    setBusy(true);
    try {
      const nextBudget = roomSnapshot.context.budget === 60000 ? 80000 : 60000;
      const res = await live.repository.updateContext({
        roomId: activeRoomId,
        expectedVersion: roomSnapshot.version,
        context: {
          ...roomSnapshot.context,
          budget: nextBudget,
        },
      });
      if (res.ok) {
        addLog('updateContext', true, `Đã đổi ngân sách thành ${nextBudget.toLocaleString('vi-VN')} đ (Ready flags đã reset)`);
        const snap = await live.repository.getRoomSnapshot(activeRoomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('updateContext', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('updateContext', false, e?.message ?? 'Lỗi cập nhật bối cảnh');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdatePreferences = async () => {
    if (!activeRoomId || !roomSnapshot) {
      addLog('updatePreferences', false, 'Chưa có phòng để cập nhật khẩu vị');
      return;
    }
    setBusy(true);
    try {
      const res = await live.repository.updatePreferences({
        roomId: activeRoomId,
        expectedVersion: roomSnapshot.version,
        preferences: DEFAULT_PREFERENCES,
      });
      if (res.ok) {
        addLog('updatePreferences', true, 'Đã cập nhật khẩu vị & đồng ý chống lặp');
        const snap = await live.repository.getRoomSnapshot(activeRoomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('updatePreferences', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('updatePreferences', false, e?.message ?? 'Lỗi cập nhật khẩu vị');
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    if (!activeRoomId) {
      addLog('getRoomSnapshot', false, 'Chưa có phòng để tải');
      return;
    }
    setBusy(true);
    try {
      const snap = await live.repository.getRoomSnapshot(activeRoomId);
      if (snap.ok) {
        setRoomSnapshot(snap.data);
        addLog('getRoomSnapshot', true, `Tải trạng thái thành công: ${snap.data.state} · ${snap.data.members.length} thành viên`);
      } else {
        addLog('getRoomSnapshot', false, `Lỗi: ${snap.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('getRoomSnapshot', false, e?.message ?? 'Lỗi tải phòng');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleReady = async () => {
    if (!activeRoomId || !roomSnapshot) return;
    const currentMember = roomSnapshot.members.find(
      m => m.userId === (live.user?.id ?? roomSnapshot.hostUserId)
    ) ?? roomSnapshot.members[0];
    const nextReady = !currentMember?.ready;
    setBusy(true);
    try {
      const res = await live.repository.setReady({
        roomId: activeRoomId,
        expectedVersion: roomSnapshot.version,
        ready: nextReady,
      });
      if (res.ok) {
        addLog('setReady', true, `Đã chuyển sang trạng thái: ${nextReady ? 'SẴN SÀNG' : 'CHƯA SẴN SÀNG'}`);
        const snap = await live.repository.getRoomSnapshot(activeRoomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('setReady', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('setReady', false, e?.message ?? 'Lỗi sẵn sàng');
    } finally {
      setBusy(false);
    }
  };

  const handleStartRound = async () => {
    if (!activeRoomId || !roomSnapshot) return;
    setBusy(true);
    try {
      const res = await live.repository.startRound({
        roomId: activeRoomId,
        expectedVersion: roomSnapshot.version,
      });
      if (res.ok) {
        addLog('startRound', true, 'Phòng chuyển sang VÒNG 1 thành công!');
        const snap = await live.repository.getRoomSnapshot(activeRoomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('startRound', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('startRound', false, e?.message ?? 'Lỗi bắt đầu');
    } finally {
      setBusy(false);
    }
  };

  return {
    live,
    activeRoomId,
    activeRoomCode,
    setActiveRoomCode,
    roomSnapshot,
    busy,
    logs,
    handleEnsureSession,
    handleCreateRoom,
    handleJoinRoom,
    handleUpdateContext,
    handleUpdatePreferences,
    handleRefresh,
    handleToggleReady,
    handleStartRound,
  };
}
