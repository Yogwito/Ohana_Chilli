import { describe, expect, it } from 'vitest';
import { resolveActiveMenuSection } from '@/domain/menuScrollSpy';

const sections = [
  { slug: 'bowls', top: -640 },
  { slug: 'nachos', top: -120 },
  { slug: 'combos', top: 260 },
  { slug: 'adicionales', top: 520 },
  { slug: 'bebidas', top: 760 },
];

describe('resolveActiveMenuSection', () => {
  it('selects the last section that crossed the sticky navigation', () => {
    expect(resolveActiveMenuSection({
      sections,
      activationLine: 121,
      isAtPageEnd: false,
    })).toBe('nachos');
  });

  it('selects Bebidas at the bottom on mobile or desktop even when the final section is short', () => {
    expect(resolveActiveMenuSection({
      sections,
      activationLine: 121,
      isAtPageEnd: true,
    })).toBe('bebidas');
  });

  it('keeps the first category active before the menu reaches the navigation', () => {
    expect(resolveActiveMenuSection({
      sections: sections.map((section, index) => ({ ...section, top: 500 + index * 300 })),
      activationLine: 121,
      isAtPageEnd: false,
    })).toBe('bowls');
  });

  it('returns null when the menu has no rendered sections', () => {
    expect(resolveActiveMenuSection({
      sections: [],
      activationLine: 121,
      isAtPageEnd: false,
    })).toBeNull();
  });
});
