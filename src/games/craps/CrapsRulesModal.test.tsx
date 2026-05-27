import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CrapsRulesModal from './CrapsRulesModal';

describe('CrapsRulesModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<CrapsRulesModal open={false} onClose={vi.fn()} />);
    expect(container.querySelector('[data-craps-rules-body]')).toBeNull();
  });

  it('renders all rule sections when open', () => {
    render(<CrapsRulesModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('OBJECT')).toBeInTheDocument();
    expect(screen.getByText(/PASS LINE/)).toBeInTheDocument();
    expect(screen.getByText(/COME/)).toBeInTheDocument();
    expect(screen.getByText('PLACE 4-10')).toBeInTheDocument();
    expect(screen.getByText('FIELD')).toBeInTheDocument();
    expect(screen.getByText('HARDWAYS')).toBeInTheDocument();
    expect(screen.getByText('PROPOSITIONS')).toBeInTheDocument();
    expect(screen.getByText('TABLE')).toBeInTheDocument();
    expect(screen.getByText(/MASQUER · Craps/)).toBeInTheDocument();
  });

  it('attaches data-craps-rules-body to the body container', () => {
    const { container } = render(<CrapsRulesModal open={true} onClose={vi.fn()} />);
    expect(container.querySelector('[data-craps-rules-body]')).toBeInTheDocument();
  });
});
