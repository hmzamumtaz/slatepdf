/**
 * Single source of truth for the brand. Changing the name here changes it in
 * the header, the footer, page metadata, the document properties written into
 * every export, and the filename of every download.
 */
export const SITE_NAME = 'Slate PDF';

/** Used where a filename or identifier can't contain a space. */
export const SITE_SLUG = 'SlatePDF';

export const SITE_TAGLINE = 'The PDF toolkit that runs in your browser';

export const SITE_DESCRIPTION =
  'Merge, split, compress, convert, sign and edit PDFs right in your browser. No uploads, no sign-up, no file size limits.';

/** Absolute origin, used for canonical URLs, Open Graph and the sitemap. */
export const SITE_URL = 'https://pdflux1.vercel.app';
