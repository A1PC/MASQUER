import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminDangerZone from './AdminDangerZone';

describe('AdminDangerZone', () => {
  it('renders DANGER ZONE heading + wipe trigger', () => {
    render(<AdminDangerZone />);
    expect(screen.getByText(/DANGER ZONE/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /WIPE ALL DATA/i })).toBeInTheDocument();
  });

  it('does NOT render the confirm modal until the trigger is clicked', () => {
    render(<AdminDangerZone />);
    expect(document.querySelector('[data-admin-wipe-modal]')).toBeNull();
  });

  it('clicking the trigger opens the confirm modal with CANCEL + CONFIRM buttons', () => {
    const { container } = render(<AdminDangerZone />);
    fireEvent.click(container.querySelector('[data-admin-wipe-trigger]') as HTMLElement);
    expect(document.querySelector('[data-admin-wipe-modal]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CANCEL/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CONFIRM WIPE/i })).toBeInTheDocument();
  });

  it('CANCEL closes the modal without wiping', () => {
    const { container } = render(<AdminDangerZone />);
    fireEvent.click(container.querySelector('[data-admin-wipe-trigger]') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: /CANCEL/i }));
    expect(document.querySelector('[data-admin-wipe-modal]')).toBeNull();
  });

  it('uses casino-red destructive tier on the danger panel and buttons', () => {
    const { container } = render(<AdminDangerZone />);
    const panel = container.querySelector('[data-admin-danger-zone]') as HTMLElement;
    expect(panel.className).toContain('border-casino-red');
    const trigger = container.querySelector('[data-admin-wipe-trigger]') as HTMLElement;
    expect(trigger.className).toContain('text-casino-red');
  });
});
