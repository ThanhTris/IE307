import { useEffect, useRef, useState } from 'react';
import type { ErrorCode, JoinRoomResponse } from '../../../data/api/contracts';
import type { JoinRoomEntryProps } from '../screens/JoinRoomEntryScreen';
import { normalizeRoomCode, validDisplayName, validRoomCode } from '../services/roomEntry';
import { validPublicPreview, type JoinRoomPublicPreview } from '../services/joinPreview';
import { useRoomSubmission } from './useRoomEntry';

export function useJoinRoomEntry({ repository, preview, initialCode = '', initialDisplayName = '', onScan, onEntered, onBack, createRequestId }: JoinRoomEntryProps) {
  const [code, setCode] = useState(normalizeRoomCode(initialCode));
  const [incoming, setIncoming] = useState(normalizeRoomCode(initialCode));
  const [name, setName] = useState(initialDisplayName);
  const [camera, setCamera] = useState(false);
  const [summary, setSummary] = useState<JoinRoomPublicPreview>();
  const [validation, setValidation] = useState<string>();
  const [readError, setReadError] = useState<ErrorCode>();
  const [readBusy, setReadBusy] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('Camera chưa sẵn sàng. Bạn có thể nhập mã phòng.');
  const mounted = useRef(false), readLock = useRef(false), joinLock = useRef(false);
  const readGeneration = useRef(0);
  const frozen = useRef<{ code: string; displayName: string } | undefined>(undefined);
  const intent = useRef(''), sequence = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const submitted = useRoomSubmission<JoinRoomResponse>(data => onEntered({ roomId: data.roomId, code: data.code, version: data.version, role: 'member' }), createRequestId);
  const mutationLocked = submitted.busy || submitted.uncertain || submitted.accepted;
  const disabled = readBusy || mutationLocked;
  const normalizedIncoming = normalizeRoomCode(initialCode);
  if (incoming !== normalizedIncoming && !disabled) {
    setIncoming(normalizedIncoming); setCode(normalizedIncoming); setSummary(undefined); setValidation(undefined); setReadError(undefined); submitted.clearError();
  }
  const clearPreview = () => { setSummary(undefined); setValidation(undefined); setReadError(undefined); submitted.clearError(); };
  const editCode = (value: string) => { if (!disabled) { setCode(normalizeRoomCode(value)); clearPreview(); } };
  const editName = (value: string) => { if (!disabled) { setName(value); clearPreview(); } };
  const read = async () => {
    if (!preview || readLock.current || disabled) return;
    if (!validRoomCode(code)) { setValidation('Mã cần đúng 6 chữ/số, không dùng I, O, 0 hoặc 1.'); return; }
    if (!validDisplayName(name)) { setValidation('Tên cần từ 1 đến 24 ký tự.'); return; }
    const requested = normalizeRoomCode(code), generation = ++readGeneration.current;
    readLock.current = true; setReadBusy(true); setReadError(undefined); setSummary(undefined); setValidation(undefined);
    try {
      const result = await preview(requested);
      if (!mounted.current || generation !== readGeneration.current) return;
      if (!result.ok) setReadError(result.error.messageKey);
      else if (!validPublicPreview(result.data, requested)) setReadError('MALFORMED_RESPONSE');
      else setSummary({ code: result.data.code, memberCount: result.data.memberCount, capacity: result.data.capacity });
    } catch { if (mounted.current && generation === readGeneration.current) setReadError('NETWORK_ERROR'); }
    finally { if (generation === readGeneration.current) { readLock.current = false; if (mounted.current) setReadBusy(false); } }
  };
  const join = async () => {
    if (readLock.current || joinLock.current || submitted.accepted || submitted.busy || (!submitted.uncertain && (!summary || summary.code !== normalizeRoomCode(code) || !validDisplayName(name)))) return;
    joinLock.current = true;
    if (!submitted.uncertain) {
      frozen.current = { code: normalizeRoomCode(code), displayName: name.trim() };
      intent.current = `${JSON.stringify(frozen.current)}:${++sequence.current}`;
    }
    const request = frozen.current;
    try { if (request) await submitted.run(intent.current, requestId => repository.joinRoom({ ...request, requestId })); }
    finally { joinLock.current = false; }
  };
  const scan = async () => {
    if (readLock.current || disabled) return;
    const generation = ++readGeneration.current;
    readLock.current = true; setReadBusy(true); clearPreview();
    try {
      const result = onScan ? await onScan() : { status: 'unavailable' as const };
      if (!mounted.current || generation !== readGeneration.current) return;
      if (result.status === 'scanned') { setCode(normalizeRoomCode(result.code)); setCamera(false); }
      else setCameraMessage(result.status === 'denied' ? 'Chưa có quyền dùng camera. Cho phép camera trong cài đặt hoặc nhập mã phòng.' : 'Camera chưa sẵn sàng. Hãy nhập mã phòng.');
    } catch { if (mounted.current && generation === readGeneration.current) setCameraMessage('Chưa đọc được mã. Hãy nhập mã phòng.'); }
    finally { if (generation === readGeneration.current) { readLock.current = false; if (mounted.current) setReadBusy(false); } }
  };
  const cancelRead = () => { readGeneration.current++; readLock.current = false; setReadBusy(false); };
  const back = () => {
    if (mutationLocked || joinLock.current) return;
    cancelRead();
    if (camera) setCamera(false);
    else if (summary || readError) clearPreview();
    else onBack();
  };
  return { code, name, camera, summary, validation, readError, readBusy, cameraMessage, submitted, disabled, mutationLocked,
    editCode, editName, read, join, scan, back,
    edit: () => { if (!disabled) { clearPreview(); setCamera(false); } },
    openCamera: () => { if (!disabled) { clearPreview(); setCamera(true); } },
    closeCamera: () => { if (!mutationLocked) { cancelRead(); setCamera(false); } },
  };
}
