import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Wheel from './Wheel';
import { POCKET_ORDER, colorOf } from './wheelData';

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

describe('<Wheel /> pocket ring', () => {
  it('renders exactly 37 pocket arcs', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelectorAll('[data-pocket]')).toHaveLength(37);
  });

  it('each arc has data-pocket=number and data-color matching colorOf', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    for (const n of POCKET_ORDER) {
      const arc = document.querySelector(`[data-pocket="${n}"]`);
      expect(arc).toBeInTheDocument();
      expect(arc!.getAttribute('data-color')).toBe(colorOf(n));
    }
  });

  it('renders a text label for every pocket', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    for (const n of POCKET_ORDER) {
      const label = document.querySelector(`[data-pocket-label="${n}"]`);
      expect(label).toBeInTheDocument();
      expect(label!.textContent).toBe(String(n));
    }
  });

  it('arcs are children of a single rotating <svg> group', () => {
    render(<Wheel targetNumber={null} spinning={false} settled={false} />);
    const svg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(svg).toBeInTheDocument();
    expect(svg!.querySelectorAll('[data-pocket]')).toHaveLength(37);
  });
});
