export type ArticleStatus = 'draft' | 'scheduled' | 'published';
export type Category =
  | 'Vedic Astrology'
  | 'Mantras & Shlokas'
  | 'Sacred Audio'
  | 'Scripture Books'
  | 'Engineering & Architecture';

export const CATEGORIES: { name: Category; slug: string }[];
export const CATEGORY_NAMES: Category[];
export const DEFAULT_AUTHOR: string;
export const STATUSES: ArticleStatus[];
export const SCHEDULE_ZONE: string;
export const SUGGESTED_DAYS: number[];
export const SUGGESTED_HOUR: number;
export const SLUG_PATTERN: RegExp;
export const TITLE_LIMIT: number;
export const DESCRIPTION_LIMIT: number;

export function slugify(text: string): string;
export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string };
export function recommendCategory(title?: string, body?: string): Category;
export function readingTimeMinutes(markdown: string): number;
export function articleFromPaste(raw: string): {
  title: string;
  description: string;
  slug: string;
  keyword: string;
  author: string;
  category: Category;
  categoryRecommended: boolean;
  markdown: string;
  readingTimeMinutes: number;
  publishAt: string | null;
};
export function zonedTime(
  year: number,
  month: number,
  day: number,
  hour?: number,
  minute?: number,
  zone?: string,
): Date;
export function fromEasternInput(value: string): Date | null;
export function toEasternInput(date: Date | string): string;
export function suggestSlot(taken?: (Date | string)[], now?: Date): Date;
export function describeSlot(date: Date): string;
export function isSuggestedDay(date: Date | string): boolean;
