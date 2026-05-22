import { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Input, Textarea } from './Input';

describe('Input', () => {
  it('renders and forwards its ref', () => {
    const ref = createRef<HTMLInputElement>();
    const { getByRole } = render(<Input ref={ref} aria-label="amount" />);
    expect(getByRole('textbox', { name: 'amount' })).toBeInTheDocument();
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
  it('applies the error border in the error state', () => {
    const { getByRole } = render(<Input aria-label="amount" state="error" />);
    expect(getByRole('textbox').className).toContain('border-[#a3243a]');
  });
  it('merges className via cn', () => {
    const { getByRole } = render(<Input aria-label="amount" className="px-8" />);
    expect(getByRole('textbox').className).toContain('px-8');
  });
  it('updates its value as the user types', () => {
    const { getByRole } = render(<Input aria-label="amount" />);
    const el = getByRole('textbox') as HTMLInputElement;
    fireEvent.change(el, { target: { value: '250' } });
    expect(el.value).toBe('250');
  });
});

describe('Textarea', () => {
  it('renders and forwards its ref', () => {
    const ref = createRef<HTMLTextAreaElement>();
    const { getByRole } = render(<Textarea ref={ref} aria-label="note" />);
    expect(getByRole('textbox', { name: 'note' })).toBeInTheDocument();
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
  it('applies the error border in the error state', () => {
    const { getByRole } = render(<Textarea aria-label="note" state="error" />);
    expect(getByRole('textbox').className).toContain('border-[#a3243a]');
  });
});
