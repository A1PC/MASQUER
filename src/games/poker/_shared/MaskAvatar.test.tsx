import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MaskAvatar from './MaskAvatar';

describe('MaskAvatar', () => {
  it('renders the first letter of the mask name', () => {
    render(<MaskAvatar name="Bauta" />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('sets data-mask-name to the full name', () => {
    const { container } = render(<MaskAvatar name="Colombina" />);
    const el = container.querySelector('[data-mask-avatar]') as HTMLElement;
    expect(el.getAttribute('data-mask-name')).toBe('Colombina');
  });

  it('aria-label includes the mask name', () => {
    render(<MaskAvatar name="Pierrot" />);
    expect(screen.getByLabelText('Player Pierrot')).toBeInTheDocument();
  });

  it('applies ring-2 ring-gold-bright when active', () => {
    const { container } = render(<MaskAvatar name="Volto" active />);
    const el = container.querySelector('[data-mask-avatar]') as HTMLElement;
    expect(el.className).toContain('ring-2');
    expect(el.className).toContain('ring-gold-bright');
  });

  it('does NOT apply ring-2 when not active', () => {
    const { container } = render(<MaskAvatar name="Zanni" />);
    const el = container.querySelector('[data-mask-avatar]') as HTMLElement;
    expect(el.className).not.toContain('ring-2');
  });

  it('uses smaller dim classes when size="sm"', () => {
    const { container } = render(<MaskAvatar name="Dottore" size="sm" />);
    const el = container.querySelector('[data-mask-avatar]') as HTMLElement;
    expect(el.className).toContain('h-8');
    expect(el.className).toContain('w-8');
  });
});
