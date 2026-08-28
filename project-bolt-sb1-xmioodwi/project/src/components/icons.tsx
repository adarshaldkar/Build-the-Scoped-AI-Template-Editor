import React from "react";

type P = { className?: string; size?: number };
const S = ({ size = 16, className = "", children }: P & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

export const IconDesktop = (p: P) => (
  <S {...p}><rect x="2" y="3" width="20" height="14" rx="1.5" /><path d="M8 21h8M12 17v4" /></S>
);
export const IconTablet = (p: P) => (
  <S {...p}><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M11 18h2" /></S>
);
export const IconMobile = (p: P) => (
  <S {...p}><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></S>
);
export const IconUndo = (p: P) => (
  <S {...p}><path d="M3 7v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" /></S>
);
export const IconRedo = (p: P) => (
  <S {...p}><path d="M21 7v6h-6" /><path d="M21 13a9 9 0 1 1-3-7.7L21 8" /></S>
);
export const IconEye = (p: P) => (
  <S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></S>
);
export const IconEyeOff = (p: P) => (
  <S {...p}><path d="M10.7 6.3A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 4.2-1" /><path d="m9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></S>
);
export const IconPlay = (p: P) => (
  <S {...p}><polygon points="6 4 20 12 6 20 6 4" /></S>
);
export const IconReset = (p: P) => (
  <S {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></S>
);
export const IconUpload = (p: P) => (
  <S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 9l5-5 5 5M12 4v12" /></S>
);
export const IconChevron = (p: P) => (
  <S {...p}><polyline points="9 6 15 12 9 18" /></S>
);
export const IconChevronDown = (p: P) => (
  <S {...p}><polyline points="6 9 12 15 18 9" /></S>
);
export const IconCode = (p: P) => (
  <S {...p}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></S>
);
export const IconHistory = (p: P) => (
  <S {...p}><path d="M3 3v5h5" /><path d="M3.1 9A9 9 0 1 0 6 4.1L3 7" /><path d="M12 7v5l3 2" /></S>
);
export const IconLayers = (p: P) => (
  <S {...p}><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></S>
);
export const IconClose = (p: P) => (
  <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>
);
export const IconCheck = (p: P) => (
  <S {...p}><polyline points="20 6 9 17 4 12" /></S>
);
export const IconArrowRight = (p: P) => (
  <S {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></S>
);
export const IconArrowDown = (p: P) => (
  <S {...p}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="5 12 12 19 19 12" /></S>
);
export const IconGrip = (p: P) => (
  <S {...p}><circle cx="9" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="18" r="1" /></S>
);
export const IconType = (p: P) => (
  <S {...p}><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></S>
);
export const IconBox = (p: P) => (
  <S {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></S>
);
export const IconImage = (p: P) => (
  <S {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></S>
);
export const IconButton = (p: P) => (
  <S {...p}><rect x="2" y="8" width="20" height="8" rx="4" /><path d="M7 12h6" /></S>
);
export const IconLink = (p: P) => (
  <S {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></S>
);
export const IconSection = (p: P) => (
  <S {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></S>
);
export const IconAlert = (p: P) => (
  <S {...p}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.7 18a2 2 0 0 0 1.7 3h17.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></S>
);
export const IconSpark = (p: P) => (
  <S {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></S>
);
export const IconSearch = (p: P) => (
  <S {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></S>
);
export const IconDots = (p: P) => (
  <S {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></S>
);
export const IconReturn = (p: P) => (
  <S {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H9" /></S>
);

export const elementIcon: Record<string, React.FC<P>> = {
  text: IconType,
  button: IconButton,
  image: IconImage,
  container: IconBox,
  link: IconLink,
  section: IconSection,
  nav: IconSection,
  input: IconBox,
};
