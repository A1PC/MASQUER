import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Wheel from './Wheel';

describe('<Wheel /> scaffold', () => {
  it('renders the wheel container with role=img and a name', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    const wheel = screen.getByRole('img', { name: /roulette wheel/i });
    expect(wheel).toBeInTheDocument();
  });

  it('renders the outer ring, ball track, hub, and turret as separate layers', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelector('[data-roulette-layer="outer-ring"]')).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-layer="ball-track"]')).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-layer="hub"]')).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-layer="turret"]')).toBeInTheDocument();
  });

  it('renders a fixed gold pointer at the top', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelector('[data-roulette-layer="pointer"]')).toBeInTheDocument();
  });
});
