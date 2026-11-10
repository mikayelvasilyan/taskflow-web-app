import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { applyApiError } from '@/lib/forms';
import { tid } from '@/lib/testids';
import { AuthLayout } from './AuthLayout';

// Same rules as the API so messages match whichever side catches the problem first.
const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be at most 80 characters'),
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a digit'),
});
type Values = z.infer<typeof schema>;

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const submit = async (values: Values) => {
    setFormError(null);
    try {
      await signup(values);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setFormError(applyApiError(err, setError, ['name', 'email', 'password']));
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl">Create your account</h1>
          <p className="text-base text-fg-muted">Start tracking projects with your team.</p>
        </div>
        <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <Field
            label="Name"
            error={errors.name?.message}
            errorTestId={tid.fieldError('signup', 'name')}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                autoComplete="name"
                aria-invalid={invalid}
                aria-describedby={describedBy}
                data-testid={tid.field('signup', 'name')}
                {...register('name')}
              />
            )}
          </Field>
          <Field
            label="Email"
            error={errors.email?.message}
            errorTestId={tid.fieldError('signup', 'email')}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                aria-invalid={invalid}
                aria-describedby={describedBy}
                data-testid={tid.field('signup', 'email')}
                {...register('email')}
              />
            )}
          </Field>
          <Field
            label="Password"
            hint="At least 8 characters, with a letter and a digit."
            error={errors.password?.message}
            errorTestId={tid.fieldError('signup', 'password')}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                aria-invalid={invalid}
                aria-describedby={describedBy}
                data-testid={tid.field('signup', 'password')}
                {...register('password')}
              />
            )}
          </Field>
          {formError && (
            <p
              role="alert"
              data-testid={tid.formError('signup')}
              className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {formError}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            data-testid={tid.submit('signup')}
          >
            Create account
          </Button>
        </form>
        <p className="text-sm text-fg-muted">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-accent-fg hover:underline"
            data-testid={tid.landingLoginLink}
          >
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
