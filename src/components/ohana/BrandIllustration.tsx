type IllustrationKind = 'bowl' | 'leaf' | 'corn' | 'sauce';

/** Decorative, hand-drawn ingredient motifs; never a substitute for a product photo. */
export default function BrandIllustration({ kind = 'bowl', className = '' }: { kind?: IllustrationKind; className?: string }) {
  return (
    <svg viewBox="0 0 160 160" fill="none" className={`brand-illustration ${className}`} aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'bowl' && <>
          <path d="M28 80c7 39 26 55 52 55s45-16 52-55" fill="var(--exp-orchid)" />
          <ellipse cx="80" cy="80" rx="54" ry="20" fill="var(--exp-mint)" />
          <path d="M42 77c-10-27 3-42 22-24 0-26 28-26 31-5 17-18 40-2 24 25" fill="var(--exp-mint)" />
          <path d="M60 75c-3-10 9-16 17-9m10 11c-4-11 10-21 19-9" />
          <ellipse cx="52" cy="86" rx="11" ry="6" fill="var(--exp-melon)" />
          <ellipse cx="96" cy="88" rx="12" ry="6" fill="var(--exp-melon)" />
          <path d="m34 39-5-7m87 2 6-8M80 29v-9M68 117h24" />
        </>}
        {kind === 'leaf' && <><path d="M40 122C14 58 76 27 130 30c0 66-29 107-90 92Z" fill="var(--exp-mint)" /><path d="m34 138 70-84M59 106l-6-32m27 9 30 1m-11-24 4-19" /></>}
        {kind === 'corn' && <><path d="M57 117C26 99 26 67 28 51c30 20 36 33 41 48m30 18c31-18 31-50 29-66-30 20-36 33-41 48" fill="var(--exp-mint)" /><path d="M52 105V44c0-32 56-32 56 0v61c0 28-56 28-56 0Z" fill="var(--exp-melon)" /><path d="M70 30v83m20-83v83M56 47h48M56 66h48M56 86h48M57 105h46M44 115l36 29 36-29" /></>}
        {kind === 'sauce' && <><path d="M43 79c3 43 18 56 37 56s34-13 37-56" fill="var(--exp-orchid)" /><ellipse cx="80" cy="79" rx="38" ry="16" fill="var(--exp-melon)" /><path d="M78 24c-5 17-15 24-15 35a15 15 0 0 0 30 0c0-11-10-18-15-35Z" fill="var(--exp-mint)" /><path d="m114 35 8-8m-77 16-8-8M69 116h22" /></>}
      </g>
    </svg>
  );
}
