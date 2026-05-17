import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultBanner from './ResultBanner';
import type { SpinResult } from './types';

const spinAt = (n: number, color: 'red' | 'black' | 'green'): SpinResult => ({
  number: n,
  color,
  pocketIndex: 0,
});

describe('<ResultBanner />', () => {
  it('renders nothing when visible=false', () => {
    const { container } = render(
      <ResultBanner visible={false} spin={spinAt(17, 'black')} netChange={350} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the winning number and color in upper case', () => {
    render(<ResultBanner visible={true} spin={spinAt(17, 'black')} netChange={350} />);
    expect(screen.getByText(/17/)).toBeInTheDocument();
    expect(screen.getByText(/BLACK/i)).toBeInTheDocument();
  });

  it('shows positive netChange as "You won $N"', () => {
    render(<ResultBanner visible={true} spin={spinAt(7, 'red')} netChange={350} />);
    expect(screen.getByText(/won/i).textContent).toContain('350');
  });

  it('shows negative netChange as "You lost $N"', () => {
    render(<ResultBanner visible={true} spin={spinAt(0, 'green')} netChange={-50} />);
    expect(screen.getByText(/lost/i).textContent).toContain('50');
  });

  it('shows zero netChange as "Even — $0"', () => {
    render(<ResultBanner visible={true} spin={spinAt(2, 'black')} netChange={0} />);
    expect(screen.getByText(/even/i).textContent).toContain('0');
  });
});
