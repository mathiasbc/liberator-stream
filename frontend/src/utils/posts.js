import { formatAgo, formatCompact, formatDate } from './format';

const WEEK_SECONDS = 7 * 24 * 60 * 60;

// Hand-picked posts can be years old: past a week, show the date
export const postWhen = (post, now = Date.now()) => {
  if (post.createdAt) {
    const created = new Date(post.createdAt);
    const seconds = (now - created.getTime()) / 1000;
    return seconds > WEEK_SECONDS ? formatDate(created) : formatAgo(seconds);
  }
  return formatAgo((post.minutesAgo || 0) * 60);
};

// Time on screen grows with length: 8 s for a one-liner, up to 20 s
export const postDuration = (text) =>
  Math.min(20000, Math.max(8000, 7000 + text.length * 45));

// Whole numbers for small counts (not "9.00"), compact past a thousand
export const formatCount = (n) =>
  typeof n === 'number' && n < 1000 ? String(Math.round(n)) : formatCompact(n);

// Text sizes from largest to smallest, with about how many characters fit
// on one line of the panel and how many lines fit, at 1920×1080. The panel
// starts from this estimate and steps down if the text still overflows.
export const SIZES = [
  { fontSize: '38px', lineHeight: 1.22, perLine: 18, lines: 3 },
  { fontSize: '31px', lineHeight: 1.3, perLine: 22, lines: 4 },
  { fontSize: '27px', lineHeight: 1.32, perLine: 25, lines: 5 },
  { fontSize: '24px', lineHeight: 1.3, perLine: 31, lines: 6 },
  { fontSize: '21px', lineHeight: 1.28, perLine: 37, lines: 7 },
  { fontSize: '19px', lineHeight: 1.26, perLine: 41, lines: 8 },
  { fontSize: '17px', lineHeight: 1.26, perLine: 46, lines: 9 },
];

const estimateLines = (text, perLine) =>
  text
    .split('\n')
    .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / perLine)), 0);

const sizeFor = (text) => {
  const index = SIZES.findIndex(
    (s) => estimateLines(text, s.perLine) <= s.lines
  );
  return index >= 0 ? index : SIZES.length - 1;
};

/**
 * The text to show and the index into SIZES of the largest size it should
 * fit at. Line breaks are kept (blank lines dropped) unless turning them
 * into spaces lets the post show at a larger size.
 */
export const fitPost = (raw) => {
  const text = raw.replace(/\n\s*\n/g, '\n').trim();
  const flat = text.replace(/\s*\n\s*/g, ' ');
  const withBreaks = { text, index: sizeFor(text) };
  if (text === flat) return withBreaks;
  const flattened = { text: flat, index: sizeFor(flat) };
  return flattened.index < withBreaks.index ? flattened : withBreaks;
};
