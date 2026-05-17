import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WheelView from './WheelView';
import { POCKET_ORDER, colorOf } from './wheel';

describe('<WheelView /> scaffold', () => {
  it('renders the wheel container with role=img and a name', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    const wheel = screen.getByRole('img', { name: /roulette wheel/i });
    expect(wheel).toBeInTheDocument();
  });

  it('renders the outer ring, ball track, hub, and turret as separate layers', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelector('[data-roulette-layer="outer-ring"]')).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-layer="ball-track"]')).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-layer="hub"]')).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-layer="turret"]')).toBeInTheDocument();
  });

  it('renders a fixed gold pointer at the top', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelector('[data-roulette-layer="pointer"]')).toBeInTheDocument();
  });
});

describe('<WheelView /> pocket ring', () => {
  it('renders exactly 37 pocket arcs', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelectorAll('[data-pocket]')).toHaveLength(37);
  });

  it('each arc has data-pocket=number and data-color matching colorOf', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    for (const n of POCKET_ORDER) {
      const arc = document.querySelector(`[data-pocket="${n}"]`);
      expect(arc).toBeInTheDocument();
      expect(arc!.getAttribute('data-color')).toBe(colorOf(n));
    }
  });

  it('renders a text label for every pocket', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    for (const n of POCKET_ORDER) {
      const label = document.querySelector(`[data-pocket-label="${n}"]`);
      expect(label).toBeInTheDocument();
      expect(label!.textContent).toBe(String(n));
    }
  });

  it('arcs are children of a single rotating <svg> group', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    const svg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(svg).toBeInTheDocument();
    expect(svg!.querySelectorAll('[data-pocket]')).toHaveLength(37);
  });
});

describe('<WheelView /> ball', () => {
  it('hidden when targetNumber is null', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelector('[data-roulette-layer="ball"]')).toBeNull();
  });

  it('renders the ball when targetNumber is set', () => {
    render(<WheelView targetNumber={17} spinning={false} settled={true} />);
    expect(document.querySelector('[data-roulette-layer="ball"]')).toBeInTheDocument();
  });

  it("ball's data-pocket attribute matches targetNumber", () => {
    render(<WheelView targetNumber={32} spinning={false} settled={true} />);
    const ball = document.querySelector('[data-roulette-layer="ball"]');
    expect(ball!.getAttribute('data-pocket')).toBe('32');
  });

  it("ball's data-pocket-index reflects POCKET_ORDER position", () => {
    render(<WheelView targetNumber={32} spinning={false} settled={true} />);
    const ball = document.querySelector('[data-roulette-layer="ball"]');
    expect(ball!.getAttribute('data-pocket-index')).toBe(String(POCKET_ORDER.indexOf(32)));
  });
});

describe('<WheelView /> spin animation', () => {
  it('when spinning + targetNumber set, the pocket-ring svg has data-rotate-target set', () => {
    render(<WheelView targetNumber={32} spinning={true} settled={false} durationMs={5000} />);
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    const target = motionSvg!.getAttribute('data-rotate-target');
    expect(target).not.toBeNull();
    const value = Number(target);
    // 5 full turns + θ where θ = idx(32) * 360/37, idx(32)=1, so target ≈ 1809.73
    expect(value).toBeGreaterThan(1809);
    expect(value).toBeLessThan(1810);
  });

  it('when not spinning + targetNumber set, the wheel rests at θ', () => {
    render(<WheelView targetNumber={32} spinning={false} settled={true} durationMs={5000} />);
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    const value = Number(motionSvg!.getAttribute('data-rotate-target'));
    expect(value).toBeGreaterThan(9);
    expect(value).toBeLessThan(10);
  });

  it('when targetNumber is null, rotate target is 0', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(motionSvg!.getAttribute('data-rotate-target')).toBe('0');
  });
});

describe('<WheelView /> reduced motion', () => {
  it('when reducedMotion=true, container records data-reduced-motion=true', () => {
    render(
      <WheelView
        targetNumber={17}
        spinning={true}
        settled={false}
        durationMs={5000}
        reducedMotion={true}
      />,
    );
    const container = screen.getByRole('img', { name: /roulette wheel/i });
    expect(container.getAttribute('data-reduced-motion')).toBe('true');
  });

  it('when reducedMotion=true, the pocket-ring svg snaps (transition duration 0)', () => {
    render(
      <WheelView
        targetNumber={17}
        spinning={true}
        settled={false}
        durationMs={5000}
        reducedMotion={true}
      />,
    );
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(motionSvg!.getAttribute('data-transition-duration')).toBe('0');
  });

  it('when reducedMotion=false but durationMs=0, also snaps', () => {
    render(
      <WheelView
        targetNumber={17}
        spinning={true}
        settled={false}
        durationMs={0}
        reducedMotion={false}
      />,
    );
    const motionSvg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(motionSvg!.getAttribute('data-transition-duration')).toBe('0');
  });
});

describe('<WheelView /> pocket pulse', () => {
  it('when settled + targetNumber, that pocket has data-pulse=true', () => {
    render(<WheelView targetNumber={17} spinning={false} settled={true} />);
    expect(document.querySelector('[data-pocket="17"]')!.getAttribute('data-pulse')).toBe('true');
    expect(document.querySelector('[data-pocket="18"]')!.getAttribute('data-pulse')).toBeNull();
  });

  it('no pocket pulses when not settled', () => {
    render(<WheelView targetNumber={17} spinning={false} settled={false} />);
    expect(document.querySelectorAll('[data-pulse="true"]')).toHaveLength(0);
  });

  it('reduced motion suppresses the pulse', () => {
    render(<WheelView targetNumber={17} spinning={false} settled={true} reducedMotion={true} />);
    expect(document.querySelectorAll('[data-pulse="true"]')).toHaveLength(0);
  });
});
