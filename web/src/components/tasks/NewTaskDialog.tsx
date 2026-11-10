import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Member, Priority, Status } from '@/api/client';
import { useCreateTask } from '@/api/queries/tasks';
import { notify } from '@/components/common/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/menu';
import { applyApiError } from '@/lib/forms';
import { tid } from '@/lib/testids';
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META } from './badges';

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().max(10_000, 'Description must be at most 10,000 characters'),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigneeId: z.string(),
  dueDate: z.string(),
});
type Values = z.infer<typeof schema>;

const NONE = 'none';

export function NewTaskDialog({
  projectId,
  members,
  open,
  status,
  onOpenChange,
}: {
  projectId: string;
  members: Member[];
  open: boolean;
  status: Status;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateTask(projectId);
  const [formError, setFormError] = useState<string | null>(null);
  const defaults: Values = {
    title: '',
    description: '',
    status,
    priority: 'medium',
    assigneeId: NONE,
    dueDate: '',
  };
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), values: { ...defaults } });

  const submit = async (v: Values) => {
    setFormError(null);
    try {
      const task = await create.mutateAsync({
        title: v.title,
        status: v.status,
        priority: v.priority as Priority,
        ...(v.description && { description: v.description }),
        ...(v.assigneeId !== NONE && { assigneeId: v.assigneeId }),
        ...(v.dueDate && { dueDate: v.dueDate }),
      });
      notify.success(`Created ${task.key}`);
      reset(defaults);
      onOpenChange(false);
    } catch (err) {
      setFormError(applyApiError(err, setError, ['title', 'description', 'dueDate']));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setFormError(null);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add a task to this project.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(submit)}
          data-testid={tid.newTaskForm}
          className="flex flex-col gap-4"
        >
          <Field
            label="Title"
            error={errors.title?.message}
            errorTestId={tid.fieldError('task', 'title')}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                data-testid={tid.field('task', 'title')}
                {...register('title')}
              />
            )}
          </Field>
          <Field
            label="Description (optional)"
            error={errors.description?.message}
            errorTestId={tid.fieldError('task', 'description')}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={3}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                data-testid={tid.field('task', 'description')}
                {...register('description')}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              {({ id }) => (
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      id={id}
                      aria-label="Status"
                      value={field.value}
                      onValueChange={field.onChange}
                      data-testid={tid.field('task', 'status')}
                      options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
                    />
                  )}
                />
              )}
            </Field>
            <Field label="Priority">
              {({ id }) => (
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select
                      id={id}
                      aria-label="Priority"
                      value={field.value}
                      onValueChange={field.onChange}
                      data-testid={tid.field('task', 'priority')}
                      options={[...PRIORITIES]
                        .reverse()
                        .map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
                    />
                  )}
                />
              )}
            </Field>
            <Field label="Assignee">
              {({ id }) => (
                <Controller
                  control={control}
                  name="assigneeId"
                  render={({ field }) => (
                    <Select
                      id={id}
                      aria-label="Assignee"
                      value={field.value}
                      onValueChange={field.onChange}
                      data-testid={tid.field('task', 'assignee')}
                      options={[
                        { value: NONE, label: 'Unassigned' },
                        ...members.map((m) => ({ value: m.id, label: m.name })),
                      ]}
                    />
                  )}
                />
              )}
            </Field>
            <Field
              label="Due date"
              error={errors.dueDate?.message}
              errorTestId={tid.fieldError('task', 'dueDate')}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="date"
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  data-testid={tid.field('task', 'dueDate')}
                  {...register('dueDate')}
                />
              )}
            </Field>
          </div>
          {formError && (
            <p
              role="alert"
              data-testid={tid.formError('task')}
              className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              data-testid={tid.submit('task')}
            >
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
