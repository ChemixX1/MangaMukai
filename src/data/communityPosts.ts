export type CommunityComment = { id?: string; userId?: string; name: string; avatar?: string; text: string; image?: string; createdAt?: string; likes?: number; liked?: boolean };

export type CommunityMangaTag = {
  id: string;
  title: string;
  cover: string;
};

export type CommunityPost = {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  content: string;
  image?: string;
  manga?: CommunityMangaTag;
  likes: number;
  views?: number;
  liked?: boolean;
  saved?: boolean;
  comments: CommunityComment[];
  commentCount?: number;
  createdAt?: string;
};


export const handleOf = (name: string) => `@${name.toLowerCase().replace(/\s+/g, '')}`;

export const timeAgo = (value?: string) => {
  if (!value) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  return `${Math.floor(seconds / 86400)} d`;
};

export const formatCount = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')} mil` : String(value);
