import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Board } from '@/components/board/Board';
import { FilterBar } from '@/components/list/FilterBar';
import { TooltipProvider } from '@/components/ui/menu';
import { addDays } from '@/test/dates';
import { makeTask, renderWithProviders } from '@/test/utils';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  it('shows key, title, priority, assignee, labels and comment count', () => {
    render(<TaskCard task={makeTask()} />);
    const card = screen.getByTestId('task-card-t1');
    expect(card).toHaveAttribute('data-status', 'todo');
    expect(card).toHaveAttribute('data-priority', 'high');
    expect(card).toHaveAttribute('data-overdue', 'false');
    expect(within(card).getByText('WEB-1')).toBeInTheDocument();
    expect(within(card).getByText('Audit landing page copy')).toBeInTheDocument();
    expect(within(card).getByText('content')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Mei Tanaka' })).toBeInTheDocument();
    expect(within(card).getByText('high priority')).toBeInTheDocument();
    expect(within(card).getByText('2')).toBeInTheDocument();
  });

  it('flags overdue tasks with text, not only colour', () => {
    render(<TaskCard task={makeTask({ dueDate: addDays(-3) })} />);
    expect(screen.getByTestId('task-card-t1')).toHaveAttribute('data-overdue', 'true');
    expect(screen.getByText('3 days overdue')).toBeInTheDocument();
  });

  it('does not flag done tasks as overdue', () => {
    render(<TaskCard task={makeTask({ status: 'done', dueDate: addDays(-3) })} />);
    expect(screen.getByTestId('task-card-t1')).toHaveAttribute('data-overdue', 'false');
  });

  it('shows an unassigned marker without an assignee', () => {
    render(<TaskCard task={makeTask({ assignee: null })} />);
    expect(screen.getByLabelText('Unassigned')).toBeInTheDocument();
  });
});

describe('Board', () => {
  const tasks = [
    makeTask({ id: 'a', key: 'WEB-1', title: 'Alpha', status: 'todo', position: 1024 }),
    makeTask({ id: 'b', key: 'WEB-2', title: 'Bravo', status: 'todo', position: 2048 }),
    makeTask({ id: 'c', key: 'WEB-3', title: 'Charlie', status: 'in_progress', position: 1024 }),
  ];

  const setup = (onMove = vi.fn()) => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <Board tasks={tasks} onOpen={vi.fn()} onMove={onMove} onAdd={vi.fn()} />
        </TooltipProvider>
      </MemoryRouter>,
    );
    return onMove;
  };

  it('renders three columns with counts and cards in position order', () => {
    setup();
    expect(screen.getByTestId('board-column-todo')).toHaveAttribute('data-count', '2');
    expect(screen.getByTestId('board-column-in_progress')).toHaveAttribute('data-count', '1');
    expect(screen.getByTestId('board-column-done')).toHaveAttribute('data-count', '0');
    const todo = within(screen.getByTestId('board-column-todo'));
    const titles = todo.getAllByText(/Alpha|Bravo/).map((n) => n.textContent);
    expect(titles).toEqual(['Alpha', 'Bravo']);
    expect(screen.getByText('Finished tasks land here')).toBeInTheDocument();
  });

  it('moves a task to another status from the "Move to" menu (no drag needed)', async () => {
    const onMove = setup();
    await userEvent.click(screen.getByTestId('task-card-move-a'));
    await userEvent.click(await screen.findByTestId('task-card-move-a-done'));
    expect(onMove).toHaveBeenCalledWith({ id: 'a', status: 'done', position: 1024 });
  });
});

describe('FilterBar', () => {
  function Url() {
    return <output data-testid="url">{useLocation().search}</output>;
  }

  it('writes filters to the URL and clears them', async () => {
    renderWithProviders(
      <>
        <FilterBar members={[]} />
        <Url />
      </>,
      { route: '/x?status=todo' },
    );
    expect(screen.getByTestId('url')).toHaveTextContent('?status=todo');
    await userEvent.click(screen.getByTestId('filter-overdue-checkbox'));
    expect(screen.getByTestId('url')).toHaveTextContent('overdue=true');
    await userEvent.type(screen.getByTestId('filter-search-input'), 'copy');
    await vi.waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('q=copy'));
    await userEvent.click(screen.getByTestId('filter-clear'));
    expect(screen.getByTestId('url')).toBeEmptyDOMElement();
  });
});
