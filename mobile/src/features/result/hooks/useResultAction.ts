import { useEffect, useRef, useState } from 'react';
import type { ResultActionReply } from '../services/resultPresentation';

export function useResultAction(resultId: string, isMock: boolean) {
  const scope = useRef<string | undefined>(undefined), lock = useRef<string | undefined>(undefined);
  const [status, setStatus] = useState<{ key: string; busy: boolean; message?: string }>();
  useEffect(() => { scope.current = resultId; return () => { scope.current = undefined; }; }, [resultId]);
  const run = async (label: string, action?: () => void | ResultActionReply | Promise<void | ResultActionReply>) => {
    if (!action || lock.current === resultId) return;
    lock.current = resultId; setStatus({ key: resultId, busy: true });
    try {
      const reply = await action();
      if (scope.current !== resultId) return;
      setStatus({ key: resultId, busy: false, message: reply && !reply.ok ? 'Chưa thực hiện được thao tác. Hãy thử lại.' : isMock ? `Mô phỏng · ${label}. Chưa gọi dịch vụ bên ngoài.` : 'Đã nhận yêu cầu của bạn.' });
    } catch { if (scope.current === resultId) setStatus({ key: resultId, busy: false, message: 'Chưa thực hiện được thao tác. Hãy thử lại.' }); }
    finally { if (lock.current === resultId) lock.current = undefined; }
  };
  return { run, busy: status?.key === resultId && status.busy, message: status?.key === resultId ? status.message : undefined };
}
