export interface MenuSectionPosition {
  slug: string;
  top: number;
}

interface ResolveActiveMenuSectionOptions {
  sections: MenuSectionPosition[];
  activationLine: number;
  isAtPageEnd: boolean;
}

/**
 * Resolves the menu category that should be highlighted while scrolling.
 * At the end of the page, the final category wins even when it is too short
 * to cross the sticky navigation before scrolling runs out.
 */
export function resolveActiveMenuSection({
  sections,
  activationLine,
  isAtPageEnd,
}: ResolveActiveMenuSectionOptions): string | null {
  if (sections.length === 0) return null;
  if (isAtPageEnd) return sections[sections.length - 1].slug;

  let activeSlug = sections[0].slug;

  for (const section of sections) {
    if (section.top > activationLine) break;
    activeSlug = section.slug;
  }

  return activeSlug;
}
