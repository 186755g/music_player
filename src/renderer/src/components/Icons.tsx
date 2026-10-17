import type { SVGProps } from 'react';

function IconBase(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props} />;
}

export function PreviousIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 6v12" />
      <path d="M18 6 9 12l9 6V6Z" />
      <path d="M6 12h1" />
    </IconBase>
  );
}

export function NextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M18 6v12" />
      <path d="M6 6l9 6-9 6V6Z" />
      <path d="M18 12h-1" />
    </IconBase>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8 5v14" fill="currentColor" stroke="none" />
      <path d="M16 5v14" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function VolumeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" stroke="none" />
      <path d="M15.5 9.5a5 5 0 0 1 0 5" />
      <path d="M18.5 7.5a8 8 0 0 1 0 9" />
    </IconBase>
  );
}

export function MuteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" stroke="none" />
      <path d="m16 9 5 6" />
      <path d="m21 9-5 6" />
    </IconBase>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="5" />
      <path d="m16 16 4 4" />
    </IconBase>
  );
}

export function MusicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="7" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </IconBase>
  );
}

export function EqualizerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5 18V9" />
      <path d="M9 18V5" />
      <path d="M13 18v-7" />
      <path d="M17 18V9" />
      <path d="M21 18V6" />
    </IconBase>
  );
}

export function LyricsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 6h12v2H6z" />
      <path d="M6 11h12v2H6z" />
      <path d="M6 16h8v2H6z" />
    </IconBase>
  );
}
