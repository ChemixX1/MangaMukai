type IconProps = { size?: number; className?: string };

export { PaletteIcon } from './referenceIcons';

export { TypeIcon } from './referenceIcons';

export { StudioIcon } from './referenceIcons';

export { PlatformIcon } from './referenceIcons';

export { PublishedIcon } from './referenceIcons';

export { ChaptersTabIcon } from './referenceIcons';

export { SynopsisTabIcon } from './referenceIcons';

export { CommentsTabIcon } from './referenceIcons';

export const SearchIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M21 21L16.514 16.506M19 10.5C19 12.7543 18.1045 14.9163 16.5104 16.5104C14.9163 18.1045 12.7543 19 10.5 19C8.24566 19 6.08365 18.1045 4.48959 16.5104C2.89553 14.9163 2 12.7543 2 10.5C2 8.24566 2.89553 6.08365 4.48959 4.48959C6.08365 2.89553 8.24566 2 10.5 2C12.7543 2 14.9163 2.89553 16.5104 4.48959C18.1045 6.08365 19 8.24566 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const SortDownIcon = ({ size = 24, className }: IconProps) => (
  <svg width={Math.round(size * 0.75)} height={size} viewBox="338 0 18 24" fill="none" className={className} aria-hidden="true">
    <path d="M347 22L340 15L341.4 13.6L346 18.175V2H348V18.175L352.6 13.575L354 15L347 22Z" fill="currentColor"/>
  </svg>
);

export const SortUpIcon = ({ size = 24, className }: IconProps) => (
  <svg width={Math.round(size * 0.75)} height={size} viewBox="353 0 18 24" fill="none" className={className} aria-hidden="true">
    <path d="M362 2L355 9L356.4 10.4L361 5.825V22H363V5.825L367.6 10.425L369 9L362 2Z" fill="currentColor"/>
  </svg>
);

export { ChapterCommentIcon } from './referenceIcons';

export { ShowAllIcon } from './referenceIcons';

export { PurchasedIcon } from './referenceIcons';

export { CommentsHeadingIcon } from './referenceIcons';

export { CommentReplyIcon } from './referenceIcons';

export { PublishIcon } from './referenceIcons';
