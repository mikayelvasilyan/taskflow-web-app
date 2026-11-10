import { zodResolver } from '@hookform/resolvers/zod';
import { Monitor, Moon, Sun, Trash2, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api, isApiError, type Role } from '@/api/client';
import { useDeleteUser, useSetUserRole, useUsers } from '@/api/queries/misc';
import { Avatar } from '@/components/common/Avatar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/states';
import { notify } from '@/components/common/toast';
import { Page, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/menu';
import { Badge, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import { applyApiError } from '@/lib/forms';
import { tid } from '@/lib/testids';

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be at most 80 characters'),
  currentPassword: z.string(),
  newPassword: z.string(),
});
type ProfileValues = z.infer<typeof profileSchema>;

function ProfileTab() {
  const { user, refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', currentPassword: '', newPassword: '' },
  });
  if (!user) return null;

  const submit = async (v: ProfileValues) => {
    setFormError(null);
    if (v.newPassword && !v.currentPassword) {
      setError('currentPassword', { message: 'Current password is required to set a new one' });
      return;
    }
    if (v.newPassword && v.newPassword.length < 8) {
      setError('newPassword', { message: 'Password must be at least 8 characters' });
      return;
    }
    try {
      await api.patch('/auth/me', {
        name: v.name,
        ...(v.newPassword && { currentPassword: v.currentPassword, newPassword: v.newPassword }),
      });
      await refresh();
      reset({ name: v.name, currentPassword: '', newPassword: '' });
      notify.success('Profile updated');
    } catch (err) {
      setFormError(applyApiError(err, setError, ['name', 'currentPassword', 'newPassword']));
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="flex max-w-md flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar person={user} size="lg" className="ring-0" />
        <div>
          <p className="font-semibold">{user.email}</p>
          <Badge tone={user.role === 'admin' ? 'accent' : 'neutral'}>{user.role}</Badge>
        </div>
      </div>
      <Field
        label="Name"
        error={errors.name?.message}
        errorTestId={tid.fieldError('profile', 'name')}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            data-testid={tid.field('profile', 'name')}
            {...register('name')}
          />
        )}
      </Field>
      <fieldset
        className="flex flex-col gap-4 rounded-lg border border-border p-4"
        disabled={user.isProtected}
      >
        <legend className="px-1 text-sm font-semibold">Change password</legend>
        {user.isProtected && (
          <p className="text-sm text-fg-muted">Demo accounts cannot change their password.</p>
        )}
        <Field
          label="Current password"
          error={errors.currentPassword?.message}
          errorTestId={tid.fieldError('profile', 'currentPassword')}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              data-testid={tid.field('profile', 'currentPassword')}
              {...register('currentPassword')}
            />
          )}
        </Field>
        <Field
          label="New password"
          hint="At least 8 characters, with a letter and a digit."
          error={errors.newPassword?.message}
          errorTestId={tid.fieldError('profile', 'newPassword')}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              data-testid={tid.field('profile', 'newPassword')}
              {...register('newPassword')}
            />
          )}
        </Field>
      </fieldset>
      {formError && (
        <p
          role="alert"
          data-testid={tid.formError('profile')}
          className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {formError}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        className="self-start"
        loading={isSubmitting}
        data-testid={tid.submit('profile')}
      >
        Save changes
      </Button>
    </form>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function AppearanceTab() {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {THEMES.map((t) => {
        const selected = preference === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(t.value)}
            data-testid={tid.themeOption(t.value)}
            className={cn(
              'flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors',
              selected
                ? 'border-accent bg-accent-soft'
                : 'border-border bg-surface hover:border-border-strong',
            )}
          >
            <t.icon
              className={cn('size-5', selected ? 'text-accent-fg' : 'text-fg-muted')}
              aria-hidden
            />
            <span className="font-medium">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MembersTab() {
  const { user: me } = useAuth();
  const users = useUsers();
  const setRole = useSetUserRole();
  const remove = useDeleteUser();
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);

  if (users.isLoading) return <Skeleton data-testid={tid.skeleton('members')} className="h-48" />;
  if (users.isError) return <ErrorState name="users" onRetry={() => users.refetch()} />;

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
        <table className="w-full border-collapse text-base max-md:block">
          <thead className="border-b border-border bg-surface-2 max-md:hidden">
            <tr>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-fg-muted">
                Member
              </th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-fg-muted">
                Role
              </th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-fg-muted">
                Projects
              </th>
              <th scope="col" className="w-12 px-4 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="max-md:block">
            {users.data?.map((u) => {
              const locked = u.isProtected || u.id === me?.id;
              return (
                <tr
                  key={u.id}
                  data-testid={tid.userRow(u.id)}
                  className="border-b border-border last:border-0 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-3 max-md:p-3"
                >
                  <td className="px-4 py-2.5 max-md:min-w-0 max-md:basis-full max-md:p-0">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar person={u} size="md" className="ring-0" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{u.name}</span>
                        <span className="truncate text-sm text-fg-muted">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 max-md:p-0">
                    <Select
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      disabled={locked || setRole.isPending}
                      data-testid={tid.memberRole(u.id)}
                      className="w-32 max-md:w-36"
                      onValueChange={(role) =>
                        setRole.mutate(
                          { id: u.id, role: role as Role },
                          {
                            onSuccess: () =>
                              notify.success(
                                `${u.name} is now ${role === 'admin' ? 'an admin' : 'a member'}`,
                              ),
                            onError: (e) =>
                              notify.error(
                                isApiError(e) ? e.message : 'Could not change the role.',
                              ),
                          },
                        )
                      }
                      options={[
                        { value: 'admin', label: 'Admin' },
                        { value: 'member', label: 'Member' },
                      ]}
                    />
                  </td>
                  <td className="tabular px-4 py-2.5 text-right text-fg-muted max-md:flex-1 max-md:p-0 max-md:text-left">
                    {u.projectCount} {u.projectCount === 1 ? 'project' : 'projects'}
                  </td>
                  <td className="px-4 py-2.5 text-right max-md:p-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${u.name}`}
                      disabled={locked}
                      onClick={() => setToRemove({ id: u.id, name: u.name })}
                      data-testid={tid.userDelete(u.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title={`Remove ${toRemove?.name ?? 'this member'}?`}
        description="Their account and the projects they own will be permanently deleted. This cannot be undone."
        confirmLabel="Remove member"
        danger
        onConfirm={async () => {
          if (!toRemove) return;
          try {
            await remove.mutateAsync(toRemove.id);
            notify.success(`Removed ${toRemove.name}`);
          } catch (e) {
            notify.error(isApiError(e) ? e.message : 'Could not remove the member.');
          }
        }}
      />
    </>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const isAdmin = user?.role === 'admin';
  const requested = sp.get('tab');
  const tab =
    requested === 'appearance' || (requested === 'members' && isAdmin) ? requested : 'profile';

  return (
    <Page className="max-w-4xl">
      <div data-testid={tid.settingsPage} className="flex flex-col gap-6">
        <PageHeader title="Settings" description="Manage your profile, appearance and team." />
        <Tabs
          value={tab}
          onValueChange={(v) => setSp({ tab: v }, { replace: true })}
          className="flex flex-col gap-6"
        >
          <TabsList className="w-fit">
            <TabsTrigger value="profile" data-testid={tid.settingsTab('profile')}>
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" data-testid={tid.settingsTab('appearance')}>
              Appearance
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="members" data-testid={tid.settingsTab('members')}>
                Members
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>
          <TabsContent value="appearance">
            <AppearanceTab />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="members">
              <MembersTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Page>
  );
}
