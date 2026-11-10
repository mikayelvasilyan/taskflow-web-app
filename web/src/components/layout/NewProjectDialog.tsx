import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useCreateProject } from '@/api/queries/projects';
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
import { useShell } from '@/hooks/useShell';
import { applyApiError } from '@/lib/forms';
import { tid } from '@/lib/testids';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(60, 'Project name must be at most 60 characters'),
  description: z.string().trim().max(500, 'Description must be at most 500 characters'),
});
type Values = z.infer<typeof schema>;

export function NewProjectDialog() {
  const { newProjectOpen, setNewProjectOpen } = useShell();
  const create = useCreateProject();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  });

  const submit = async (values: Values) => {
    setFormError(null);
    try {
      const project = await create.mutateAsync({
        name: values.name,
        ...(values.description && { description: values.description }),
      });
      notify.success(`Created ${project.name}`);
      setNewProjectOpen(false);
      reset();
      navigate(`/app/projects/${project.id}/board`);
    } catch (err) {
      setFormError(applyApiError(err, setError, ['name', 'description']));
    }
  };

  return (
    <Dialog
      open={newProjectOpen}
      onOpenChange={(o) => {
        setNewProjectOpen(o);
        if (!o) {
          reset();
          setFormError(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Projects group tasks and the people working on them.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(submit)}
          data-testid={tid.newProjectForm}
          className="flex flex-col gap-4"
        >
          <Field
            label="Name"
            error={errors.name?.message}
            errorTestId={tid.fieldError('project', 'name')}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                data-testid={tid.field('project', 'name')}
                {...register('name')}
              />
            )}
          </Field>
          <Field
            label="Description (optional)"
            error={errors.description?.message}
            errorTestId={tid.fieldError('project', 'description')}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={3}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                data-testid={tid.field('project', 'description')}
                {...register('description')}
              />
            )}
          </Field>
          {formError && (
            <p
              role="alert"
              data-testid={tid.formError('project')}
              className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button onClick={() => setNewProjectOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              data-testid={tid.submit('project')}
            >
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
