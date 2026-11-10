import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { tid } from '@/lib/testids';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  /** Ask the user to type this text before the confirm button enables (e.g. the project name). */
  requireText?: string;
  onConfirm: () => Promise<unknown> | void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  danger,
  requireText,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const blocked = !!requireText && typed.trim() !== requireText;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setTyped('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTyped('');
      }}
    >
      <DialogContent data-testid={tid.confirmDialog}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requireText && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Type <span className="font-semibold">{requireText}</span> to confirm
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              data-testid={tid.confirmDialogInput}
            />
          </label>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} data-testid={tid.confirmDialogCancel}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            disabled={blocked}
            onClick={confirm}
            data-testid={tid.confirmDialogConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
