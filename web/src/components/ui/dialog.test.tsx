import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogDescription, DialogTitle, SheetContent } from './dialog';

/** Opened from state with no DialogTrigger, like every dialog in the app. */
function Harness({ sheet }: { sheet?: boolean }) {
  const [open, setOpen] = useState(false);
  const Content = sheet ? SheetContent : DialogContent;
  return (
    <>
      <button onClick={() => setOpen(true)}>Open it</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <Content>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
          <button>Inside</button>
        </Content>
      </Dialog>
    </>
  );
}

describe.each([
  ['dialog', false],
  ['side sheet', true],
])('focus handling of the %s', (_name, sheet) => {
  it('moves focus inside when opened and back to the opener when closed', async () => {
    render(<Harness sheet={sheet} />);
    const opener = screen.getByRole('button', { name: 'Open it' });
    await userEvent.click(opener);

    const dialog = await screen.findByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
