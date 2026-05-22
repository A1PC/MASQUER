import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Heading, Text } from './Text';

describe('Heading', () => {
  it('renders the matching heading level tag', () => {
    const { getByRole } = render(<Heading level={1}>Title</Heading>);
    const el = getByRole('heading', { level: 1, name: 'Title' });
    expect(el.tagName.toLowerCase()).toBe('h1');
  });
  it('uses the display font', () => {
    const { getByText } = render(<Heading level={2}>Sub</Heading>);
    expect(getByText('Sub').className).toContain('font-display');
  });
});

describe('Text', () => {
  it('renders children', () => {
    const { getByText } = render(<Text>Body</Text>);
    expect(getByText('Body')).toBeInTheDocument();
  });
  it('applies the muted tone', () => {
    const { getByText } = render(<Text tone="muted">Quiet</Text>);
    expect(getByText('Quiet').className).toContain('text-ivory/60');
  });
  it('applies the gold tone', () => {
    const { getByText } = render(<Text tone="gold">Shiny</Text>);
    expect(getByText('Shiny').className).toContain('text-gold');
  });
});
