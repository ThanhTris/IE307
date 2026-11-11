import { useEffect, useRef, useState } from 'react';
import type { ErrorCode, JoinRoomResponse } from '../../../data/api/contracts';
import type { JoinRoomEntryProps } from '../screens/JoinRoomScreen';
import { normalizeRoomCode, validDisplayName, validRoomCode } from '../services/roomEntry';
import { validPublicPreview, type JoinRoomPublicPreview } from '../services/joinPreview';
import { useRoomSubmission } from './useRoomEntry';

export function useJoinRoomEntry({ repository, preview, initialCode = '', initialDisplayName = '', onScan, qrScannerAdapter, onEntered, onBack, createRequestId }: JoinRoomEntryProps) {
  const [code, setCode] = useState(normalizeRoomCode(initialCode));
  const [incoming, setIncoming] = useState(normalizeRoomCode(initialCode));
  const [name, setName] = useState(initialDisplayName);
  const [camera, setCamera] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'scanning' | 'denied' | 'unavailable'>('idle');
  const [summary, setSummary] = useState<JoinRoomPublicPreview>();
  const [validation, setValidation] = useState<string>();
  const [readError, setReadError] = useState<ErrorCode>();
  const [readBusy, setReadBusy] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('Hướng camera về phía mã QR để quét.');
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
  const scan = async (testCodeOrUrl?: string) => {
    if (readLock.current || disabled) return;
    const generation = ++readGeneration.current;
    readLock.current = true; setReadBusy(true); clearPreview();
    try {
      let result: { status: 'scanned'; code: string } | { status: 'denied' } | { status: 'unavailable' };
      if (onScan) {
        result = await onScan();
      } else if (qrScannerAdapter) {
        const perm = await qrScannerAdapter.getPermissionStatus();
        if (perm === 'denied' || perm === 'blocked') {
          result = { status: 'denied' };
        } else if (qrScannerAdapter.simulateScan) {
          const scanRes = await qrScannerAdapter.simulateScan(testCodeOrUrl);
          result = scanRes.ok ? { status: 'scanned', code: scanRes.code } : { status: 'unavailable' };
        } else {
          result = { status: 'unavailable' };
        }
      } else {
        result = { status: 'unavailable' };
      }
      if (!mounted.current || generation !== readGeneration.current) return;
      if (result.status === 'scanned') {
        const scannedCode = normalizeRoomCode(result.code);
        setCode(scannedCode);
        setCameraStatus('idle');
        setCamera(false);
      } else if (result.status === 'denied') {
        setCameraStatus('denied');
        setCameraMessage('Bạn chưa cấp quyền truy cập camera để quét mã QR.');
      } else {
        setCameraStatus('unavailable');
        setCameraMessage('Chưa có mã QR hợp lệ. Bạn có thể nhập mã test hoặc nhập mã bằng tay.');
      }
    } catch {
      if (mounted.current && generation === readGeneration.current) {
        setCameraStatus('unavailable');
        setCameraMessage('Chưa đọc được mã. Hãy nhập mã phòng.');
      }
    }
    finally { if (generation === readGeneration.current) { readLock.current = false; if (mounted.current) setReadBusy(false); } }
  };
  const cancelRead = () => { readGeneration.current++; readLock.current = false; setReadBusy(false); };
  const back = () => {
    if (mutationLocked || joinLock.current) return;
    cancelRead();
    if (camera) { setCamera(false); setCameraStatus('idle'); }
    else if (summary || readError) clearPreview();
    else onBack();
  };
  return {
    code, name, camera, cameraStatus, summary, validation, readError, readBusy, cameraMessage, submitted, disabled, mutationLocked,
    editCode, editName, read, join, scan, back,
    edit: () => { if (!disabled) { clearPreview(); setCamera(false); setCameraStatus('idle'); } },
    openCamera: async () => {
      if (disabled) return;
      clearPreview();
      if (qrScannerAdapter) {
        const perm = await qrScannerAdapter.getPermissionStatus();
        if (perm === 'denied' || perm === 'blocked') {
          setCameraStatus('denied');
          setCameraMessage('Bạn chưa cấp quyền truy cập camera để quét mã QR.');
          setCamera(true);
          return;
        }
      }
      setCamera(true);
      setCameraStatus('idle');
    },
    closeCamera: () => { if (!mutationLocked) { cancelRead(); setCamera(false); setCameraStatus('idle'); } },
  };
}
