import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '@/test/utils';
import { FilterBar } from './FilterBar';

function Url() {
  return <output data-testid="url">{useLocation().search}</output>;
}

function mockPhone(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('FilterBar on phones', () => {
  it('shows only search and a Filters button; the controls live in a sheet', async () => {
    mockPhone(true);
    renderWithProviders(
      <>
        <FilterBar members={[]} />
        <Url />
      </>,
      { route: '/x?status=todo&overdue=true&q=copy' },
    );
    expect(screen.getByTestId('filter-search-input')).toBeInTheDocument();
    expect(screen.queryByTestId('filter-status-select')).not.toBeInTheDocument();
    // The search term is outside the sheet, so only status + overdue count.
    expect(screen.getByTestId('filters-toggle')).toHaveAccessibleName('Filters, 2 active');

    await userEvent.click(screen.getByTestId('filters-toggle'));
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(sheet).getByTestId('filter-status-select')).toBeInTheDocument();
    expect(within(sheet).getByTestId('filter-overdue-checkbox')).toBeInTheDocument();

    await userEvent.click(within(sheet).getByTestId('filter-clear'));
    expect(screen.getByTestId('url')).toBeEmptyDOMElement();
  });

  it('keeps every control inline on larger screens', () => {
    mockPhone(false);
    renderWithProviders(<FilterBar members={[]} />);
    expect(screen.getByTestId('filter-status-select')).toBeInTheDocument();
    expect(screen.queryByTestId('filters-toggle')).not.toBeInTheDocument();
  });
});
