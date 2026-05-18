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

describe('<WheelView /> wheel rotation (clockwise, 5 full turns per spin)', () => {
  // Model: the wheel rotates exactly SPIN_TURNS * 360 each spin (1800°). That
  // is an integer multiple of 360, so pocket N lands at its natural geometric
  // angle θ_N when the spin completes. The ball orbit wrapper (tested below)
  // counter-rotates to that same angle θ_N, so they always agree visually.

  it('wheel target while spinning = 1800 (5 clockwise turns)', () => {
    render(<WheelView targetNumber={32} spinning={true} settled={false} durationMs={5000} />);
    const svg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(svg!.getAttribute('data-rotate-target')).toBe('1800');
  });

  it('wheel target while settled = 0 (snap from 1800 is visually identical)', () => {
    render(<WheelView targetNumber={32} spinning={false} settled={true} durationMs={5000} />);
    const svg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(svg!.getAttribute('data-rotate-target')).toBe('0');
  });

  it('wheel target when idle (targetNumber null) = 0', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    const svg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
    expect(svg!.getAttribute('data-rotate-target')).toBe('0');
  });

  it('wheel rotation is independent of which pocket is winning', () => {
    for (const n of [0, 17, 32, 36]) {
      const { unmount } = render(
        <WheelView targetNumber={n} spinning={true} settled={false} durationMs={5000} />,
      );
      const svg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
      expect(svg!.getAttribute('data-rotate-target')).toBe('1800');
      unmount();
    }
  });

  it('transition animates only while spinning; snaps when settled or idle', () => {
    const { rerender } = render(
      <WheelView targetNumber={17} spinning={true} settled={false} durationMs={5000} />,
    );
    const svg = document.querySelector('[data-roulette-layer="pocket-ring"] svg')!;
    expect(svg.getAttribute('data-transition-duration')).toBe('5');

    rerender(<WheelView targetNumber={17} spinning={false} settled={true} durationMs={5000} />);
    expect(svg.getAttribute('data-transition-duration')).toBe('0');
  });
});

describe('<WheelView /> ball orbit (counter-clockwise, lands in winning pocket)', () => {
  const ARC = 360 / 37;
  const SPIN_TURNS = 5;

  it('ball orbit wrapper exists when targetNumber is set', () => {
    render(<WheelView targetNumber={17} spinning={false} settled={true} />);
    expect(document.querySelector('[data-roulette-layer="ball-orbit"]')).toBeInTheDocument();
  });

  it('ball orbit wrapper is not rendered when targetNumber is null', () => {
    render(<WheelView targetNumber={null} spinning={false} settled={false} />);
    expect(document.querySelector('[data-roulette-layer="ball-orbit"]')).toBeNull();
  });

  it('ball orbit while spinning = θ_N - 1800 (5 turns counter-clockwise + lands at pocket N)', () => {
    render(<WheelView targetNumber={32} spinning={true} settled={false} durationMs={5000} />);
    const wrap = document.querySelector('[data-roulette-layer="ball-orbit"]');
    const value = Number(wrap!.getAttribute('data-rotate-target'));
    // idx(32) = 1, θ_N = ARC = 9.7297…. Target = 9.73 - 1800 ≈ -1790.27
    const expected = ARC - SPIN_TURNS * 360;
    expect(value).toBeCloseTo(expected, 5);
  });

  it('ball orbit when settled = θ_N (ball at viewport angle of pocket N)', () => {
    for (const n of [0, 17, 32, 36]) {
      const { unmount } = render(<WheelView targetNumber={n} spinning={false} settled={true} />);
      const wrap = document.querySelector('[data-roulette-layer="ball-orbit"]');
      const value = Number(wrap!.getAttribute('data-rotate-target'));
      const idx = POCKET_ORDER.indexOf(n);
      const expected = idx * ARC;
      expect(value).toBeCloseTo(expected, 5);
      unmount();
    }
  });

  it('target 0 → ball settles at rotation 0 (top of wheel, where pocket 0 sits)', () => {
    render(<WheelView targetNumber={0} spinning={false} settled={true} />);
    const wrap = document.querySelector('[data-roulette-layer="ball-orbit"]');
    expect(wrap!.getAttribute('data-rotate-target')).toBe('0');
  });

  it('ball orbit shares the wheel transition (5s when spinning, 0 when settled)', () => {
    const { rerender } = render(
      <WheelView targetNumber={17} spinning={true} settled={false} durationMs={5000} />,
    );
    const wrap = document.querySelector('[data-roulette-layer="ball-orbit"]')!;
    expect(wrap.getAttribute('data-transition-duration')).toBe('5');

    rerender(<WheelView targetNumber={17} spinning={false} settled={true} durationMs={5000} />);
    expect(wrap.getAttribute('data-transition-duration')).toBe('0');
  });
});

describe('<WheelView /> visual alignment invariant: ball + pulsed pocket end at same viewport angle', () => {
  // The invariant: after the spin settles, the visual angle of the ball
  // (computed from its wrapper rotation) must equal the visual angle of the
  // pulsed pocket N (computed from θ_N + wheel rotation, both mod 360). If
  // this passes for every pocket, the visual outcome is guaranteed to match
  // the RNG result.
  it.each([0, 1, 17, 22, 32, 35, 36])(
    'target %i: ball viewport angle === pulsed pocket viewport angle',
    (target) => {
      render(<WheelView targetNumber={target} spinning={false} settled={true} />);

      const svg = document.querySelector('[data-roulette-layer="pocket-ring"] svg');
      const wrap = document.querySelector('[data-roulette-layer="ball-orbit"]');
      const wheelRot = Number(svg!.getAttribute('data-rotate-target'));
      const ballRot = Number(wrap!.getAttribute('data-rotate-target'));

      const idx = POCKET_ORDER.indexOf(target);
      const thetaDeg = idx * (360 / 37);

      const ballViewport = ((ballRot % 360) + 360) % 360;
      const pocketViewport = (((thetaDeg + wheelRot) % 360) + 360) % 360;

      expect(Math.abs(ballViewport - pocketViewport)).toBeLessThan(0.0001);
    },
  );
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
