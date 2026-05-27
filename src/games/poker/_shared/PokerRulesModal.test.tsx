import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PokerRulesModal from './PokerRulesModal';

describe('PokerRulesModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <PokerRulesModal open={false} variant="holdem" onClose={vi.fn()} />,
    );
    expect(container.querySelector('[data-poker-rules-body]')).toBeNull();
  });

  it("renders Hold'em full rules when variant=holdem", () => {
    render(<PokerRulesModal open={true} variant="holdem" onClose={vi.fn()} />);
    expect(screen.getByText('OBJECT')).toBeInTheDocument();
    expect(screen.getByText(/HAND RANKINGS/)).toBeInTheDocument();
    expect(screen.getByText('BETTING ROUNDS')).toBeInTheDocument();
    expect(screen.getByText('BLINDS')).toBeInTheDocument();
    expect(screen.getByText('SHOWDOWN')).toBeInTheDocument();
    expect(screen.getByText(/MASQUER · Hold'em/)).toBeInTheDocument();
  });

  it('renders Draw full rules when variant=five-card-draw', () => {
    render(<PokerRulesModal open={true} variant="five-card-draw" onClose={vi.fn()} />);
    expect(screen.getByText('DRAW PHASE')).toBeInTheDocument();
    expect(screen.getByText(/HAND RANKINGS/)).toBeInTheDocument();
    expect(screen.getByText('BETTING ROUNDS')).toBeInTheDocument();
    expect(screen.getByText('BLINDS')).toBeInTheDocument();
    expect(screen.getByText('SHOWDOWN')).toBeInTheDocument();
    expect(screen.getByText(/MASQUER · Five-Card Draw/)).toBeInTheDocument();
  });

  it('renders Omaha placeholder when variant=omaha', () => {
    render(<PokerRulesModal open={true} variant="omaha" onClose={vi.fn()} />);
    expect(screen.getByText(/coming in #12.v3/)).toBeInTheDocument();
    expect(screen.getByText(/MASQUER · Omaha/)).toBeInTheDocument();
  });

  it("Hold'em body has data-poker-rules-body=holdem", () => {
    const { container } = render(
      <PokerRulesModal open={true} variant="holdem" onClose={vi.fn()} />,
    );
    expect(container.querySelector('[data-poker-rules-body="holdem"]')).toBeInTheDocument();
  });
});
