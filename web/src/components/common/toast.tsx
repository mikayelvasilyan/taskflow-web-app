import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { tid } from '@/lib/testids';

function Toast({ kind, message }: { kind: 'success' | 'error'; message: string }) {
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      data-testid={kind === 'success' ? tid.toastSuccess : tid.toastError}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-base text-fg shadow-md md:w-[356px]"
    >
      <Icon
        className={
          kind === 'success' ? 'size-5 shrink-0 text-success' : 'size-5 shrink-0 text-danger'
        }
        aria-hidden
      />
      <span>{message}</span>
    </div>
  );
}

/** Toast helpers with stable test ids. */
export const notify = {
  success: (message: string) =>
    toast.custom(() => <Toast kind="success" message={message} />, { duration: 3500 }),
  error: (message: string) =>
    toast.custom(() => <Toast kind="error" message={message} />, { duration: 5000 }),
};
