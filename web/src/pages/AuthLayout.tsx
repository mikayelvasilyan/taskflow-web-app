import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandLockup } from '@/components/brand/Logo';
import { ProductVisual } from '@/components/common/ProductVisual';

/** Split layout: form on the left, product visual on the right (hidden under 1024px). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link to="/" aria-label="TaskFlow home" className="w-fit">
          <BrandLockup />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-start py-10 pt-12 lg:justify-center lg:pt-10">
          {children}
        </div>
        <p className="text-xs text-fg-subtle">A personal portfolio project by Mikayel Vasilyan.</p>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-border bg-surface-2 lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent/15 blur-3xl"
        />
        <div className="relative flex max-w-lg flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="text-4xl font-semibold leading-tight">Plan the work. See it move.</h2>
            <p className="text-lg text-fg-muted">
              Boards, lists and a dashboard that keep a small team on the same page.
            </p>
          </div>
          <ProductVisual className="-rotate-1" />
        </div>
      </aside>
    </div>
  );
}
