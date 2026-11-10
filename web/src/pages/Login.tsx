import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { applyApiError } from '@/lib/forms';
import { tid } from '@/lib/testids';
import { AuthLayout } from './AuthLayout';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  password: z.string().min(1, 'Password is required'),
});
type Values = z.infer<typeof schema>;

export const DEMO_ACCOUNTS = {
  admin: { label: 'Admin demo', email: 'demo@taskflow.dev', password: 'Demo123!' },
  member: { label: 'Member demo', email: 'member@taskflow.dev', password: 'Member123!' },
} as const;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app/dashboard';
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const submit = async (values: Values) => {
    setFormError(null);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(applyApiError(err, setError, ['email', 'password']));
    }
  };

  const fillDemo = (kind: keyof typeof DEMO_ACCOUNTS) => {
    setValue('email', DEMO_ACCOUNTS[kind].email, { shouldValidate: true });
    setValue('password', DEMO_ACCOUNTS[kind].password, { shouldValidate: true });
    void handleSubmit(submit)();
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl">Welcome back</h1>
          <p className="text-base text-fg-muted">Log in to pick up where you left off.</p>
        </div>

        <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <Field
            label="Email"
            error={errors.email?.message}
            errorTestId={tid.fieldError('login', 'email')}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                aria-invalid={invalid}
                aria-describedby={describedBy}
                data-testid={tid.field('login', 'email')}
                {...register('email')}
              />
            )}
          </Field>
          <Field
            label="Password"
            error={errors.password?.message}
            errorTestId={tid.fieldError('login', 'password')}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                aria-invalid={invalid}
                aria-describedby={describedBy}
                data-testid={tid.field('login', 'password')}
                {...register('password')}
              />
            )}
          </Field>

          {formError && (
            <p
              role="alert"
              data-testid={tid.formError('login')}
              className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {formError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            data-testid={tid.submit('login')}
          >
            Log in
          </Button>
        </form>

        <section
          aria-labelledby="demo-heading"
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <h2 id="demo-heading" className="text-sm font-semibold">
            Demo accounts
          </h2>
          <ul className="flex flex-col gap-1 text-sm text-fg-muted">
            <li>
              <span className="tabular text-fg">demo@taskflow.dev</span> /{' '}
              <span className="tabular text-fg">Demo123!</span> (admin)
            </li>
            <li>
              <span className="tabular text-fg">member@taskflow.dev</span> /{' '}
              <span className="tabular text-fg">Member123!</span> (member)
            </li>
          </ul>
          <div className="flex gap-2">
            {(Object.keys(DEMO_ACCOUNTS) as (keyof typeof DEMO_ACCOUNTS)[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => fillDemo(k)}
                data-testid={tid.demoLogin(k)}
              >
                {DEMO_ACCOUNTS[k].label}
              </Button>
            ))}
          </div>
        </section>

        <p className="text-sm text-fg-muted">
          New here?{' '}
          <Link
            to="/signup"
            className="font-medium text-accent-fg hover:underline"
            data-testid={tid.landingSignupLink}
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
