import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card, CardHeader, CardBody, CardFooter, Panel } from './Card';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(<Card>Table</Card>);
    expect(getByText('Table')).toBeInTheDocument();
  });
  it('deco variant includes the inset double-rule frame class', () => {
    const { container } = render(<Card variant="deco">x</Card>);
    expect(container.firstElementChild?.className).toContain('before:border');
  });
  it('plain variant omits the inset frame', () => {
    const { container } = render(<Card variant="plain">x</Card>);
    expect(container.firstElementChild?.className).not.toContain('before:border');
  });
  it('header uses the display font', () => {
    const { getByText } = render(<CardHeader>Texas Hold&apos;em</CardHeader>);
    expect(getByText(/Texas Hold/).className).toContain('font-display');
  });
  it('composes header/body/footer', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>Title</CardHeader>
        <CardBody>Body copy</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(getByText('Title')).toBeInTheDocument();
    expect(getByText('Body copy')).toBeInTheDocument();
    expect(getByText('Footer')).toBeInTheDocument();
  });
  it('Panel always applies the deco frame', () => {
    const { container } = render(<Panel>p</Panel>);
    expect(container.firstElementChild?.className).toContain('before:border');
  });
});
