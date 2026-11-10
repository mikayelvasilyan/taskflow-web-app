import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Trash2, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { isApiError } from '@/api/client';
import {
  useDeleteProject,
  useInvite,
  useMembers,
  useRemoveMember,
  useRevokeInvite,
  useUpdateProject,
} from '@/api/queries/projects';
import { Avatar } from '@/components/common/Avatar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/states';
import { notify } from '@/components/common/toast';
import { Page } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Badge, Skeleton } from '@/components/ui/misc';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import { applyApiError } from '@/lib/forms';
import { tid } from '@/lib/testids';
import { useProjectContext } from './ProjectLayout';

const PROJECT_COLORS = [
  '#2F5BEA',
  '#7C3AED',
  '#DB2777',
  '#EA580C',
  '#16A34A',
  '#0891B2',
  '#CA8A04',
  '#64748B',
];

const generalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(60, 'Project name must be at most 60 characters'),
  description: z.string().trim().max(500, 'Description must be at most 500 characters'),
});
type GeneralValues = z.infer<typeof generalSchema>;

const inviteSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-base text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function ProjectSettings() {
  const { project } = useProjectContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.id === project.ownerId;

  const members = useMembers(project.id);
  const update = useUpdateProject(project.id);
  const invite = useInvite(project.id);
  const revoke = useRevokeInvite(project.id);
  const removeMember = useRemoveMember(project.id);
  const del = useDeleteProject(project.id);

  const [color, setColor] = useState(project.color);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const general = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: { name: project.name, description: project.description },
  });
  const inviteForm = useForm<{ email: string }>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const saveGeneral = async (v: GeneralValues) => {
    setGeneralError(null);
    try {
      await update.mutateAsync({ name: v.name, description: v.description, color });
      notify.success('Project updated');
    } catch (err) {
      setGeneralError(applyApiError(err, general.setError, ['name', 'description']));
    }
  };

  const sendInvite = async (v: { email: string }) => {
    setInviteError(null);
    try {
      const res = await invite.mutateAsync(v.email);
      notify.success(
        res.member ? `${res.member.name} was added to the project` : `Invite saved for ${v.email}`,
      );
      inviteForm.reset();
    } catch (err) {
      setInviteError(applyApiError(err, inviteForm.setError, ['email']));
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <Page className="max-w-3xl">
        <div data-testid={tid.projectSettingsPage} className="flex flex-col gap-6">
          <Section
            title="General"
            description={
              canManage
                ? 'Rename the project or change how it looks.'
                : 'Only the project owner or an admin can edit these.'
            }
          >
            <form
              noValidate
              onSubmit={general.handleSubmit(saveGeneral)}
              className="flex flex-col gap-4"
            >
              <Field
                label="Name"
                error={general.formState.errors.name?.message}
                errorTestId={tid.fieldError('project-settings', 'name')}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    disabled={!canManage}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    data-testid={tid.field('project-settings', 'name')}
                    {...general.register('name')}
                  />
                )}
              </Field>
              <Field
                label="Description"
                error={general.formState.errors.description?.message}
                errorTestId={tid.fieldError('project-settings', 'description')}
              >
                {({ id, describedBy, invalid }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    disabled={!canManage}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    data-testid={tid.field('project-settings', 'description')}
                    {...general.register('description')}
                  />
                )}
              </Field>
              <div role="radiogroup" aria-label="Project colour" className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={color === c}
                    aria-label={`Colour ${c}`}
                    disabled={!canManage}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      'size-7 rounded-full ring-offset-2 ring-offset-surface transition disabled:opacity-60',
                      color === c && 'ring-2 ring-fg',
                    )}
                  />
                ))}
              </div>
              {generalError && (
                <p
                  role="alert"
                  data-testid={tid.formError('project-settings')}
                  className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
                >
                  {generalError}
                </p>
              )}
              {canManage && (
                <Button
                  type="submit"
                  variant="primary"
                  className="self-start"
                  loading={general.formState.isSubmitting}
                  data-testid={tid.submit('project-settings')}
                >
                  Save changes
                </Button>
              )}
            </form>
          </Section>

          <Section title="Members" description="People who can see and edit tasks in this project.">
            {members.isLoading ? (
              <Skeleton data-testid={tid.skeleton('members')} className="h-32" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {members.data?.members.map((m) => (
                  <li
                    key={m.id}
                    data-testid={tid.memberRow(m.id)}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <Avatar person={m} size="md" className="ring-0" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{m.name}</span>
                      <span className="truncate text-sm text-fg-muted">{m.email}</span>
                    </span>
                    {m.id === project.ownerId && <Badge tone="accent">Owner</Badge>}
                    {canManage && m.id !== project.ownerId && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => setToRemove({ id: m.id, name: m.name })}
                        data-testid={tid.memberRemove(m.id)}
                      >
                        <UserMinus className="size-4" aria-hidden />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canManage && (
              <form
                noValidate
                onSubmit={inviteForm.handleSubmit(sendInvite)}
                className="flex flex-col gap-2 border-t border-border pt-4"
              >
                <div className="flex items-start gap-2">
                  <Field
                    label="Invite by email"
                    className="flex-1"
                    error={inviteForm.formState.errors.email?.message}
                    errorTestId={tid.fieldError('invite', 'email')}
                  >
                    {({ id, describedBy, invalid }) => (
                      <Input
                        id={id}
                        type="email"
                        placeholder="teammate@example.com"
                        aria-invalid={invalid}
                        aria-describedby={describedBy}
                        data-testid={tid.field('invite', 'email')}
                        {...inviteForm.register('email')}
                      />
                    )}
                  </Field>
                  <Button
                    type="submit"
                    variant="primary"
                    className="mt-[26px]"
                    loading={inviteForm.formState.isSubmitting}
                    data-testid={tid.submit('invite')}
                  >
                    Invite
                  </Button>
                </div>
                <p className="text-xs text-fg-muted">
                  Nothing is emailed. Existing users join right away; others are added when they
                  sign up.
                </p>
                {inviteError && (
                  <p
                    role="alert"
                    data-testid={tid.formError('invite')}
                    className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
                  >
                    {inviteError}
                  </p>
                )}
              </form>
            )}

            {members.data && members.data.invites.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">Pending invites</h3>
                <ul className="flex flex-col divide-y divide-border">
                  {members.data.invites.map((i) => (
                    <li
                      key={i.id}
                      data-testid={tid.inviteRow(i.id)}
                      className="flex items-center gap-3 py-2"
                    >
                      <Mail className="size-4 text-fg-subtle" aria-hidden />
                      <span className="flex-1 truncate text-base">{i.email}</span>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            revoke.mutate(i.id, {
                              onError: () => notify.error('Could not revoke the invite.'),
                            })
                          }
                          data-testid={tid.inviteRevoke(i.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {members.data && members.data.members.length === 0 && (
              <EmptyState name="project-members" art="members" title="No members" />
            )}
          </Section>

          {canManage && (
            <Section
              title="Danger zone"
              description="Deleting a project removes all of its tasks, comments and labels."
            >
              <Button
                variant="danger"
                className="self-start"
                onClick={() => setConfirmDelete(true)}
                data-testid={tid.projectDelete}
              >
                <Trash2 className="size-4" aria-hidden /> Delete project
              </Button>
            </Section>
          )}
        </div>
      </Page>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this project?"
        description="All tasks in this project will be permanently deleted. This cannot be undone."
        confirmLabel="Delete project"
        requireText={project.name}
        danger
        onConfirm={async () => {
          try {
            await del.mutateAsync();
            notify.success(`Deleted ${project.name}`);
            navigate('/app/dashboard', { replace: true });
          } catch (err) {
            notify.error(isApiError(err) ? err.message : 'Could not delete the project.');
          }
        }}
      />
      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title={`Remove ${toRemove?.name ?? 'this member'}?`}
        description="They lose access to this project and are unassigned from its tasks."
        confirmLabel="Remove member"
        danger
        onConfirm={async () => {
          if (!toRemove) return;
          try {
            await removeMember.mutateAsync(toRemove.id);
            notify.success(`Removed ${toRemove.name}`);
          } catch (err) {
            notify.error(isApiError(err) ? err.message : 'Could not remove the member.');
          }
        }}
      />
    </div>
  );
}
