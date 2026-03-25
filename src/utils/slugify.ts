/**
 * Convert arbitrary text into a URL-safe, lowercase, hyphenated slug.
 *
 * - Strips apostrophes, periods, and other special characters
 * - Collapses whitespace and hyphens
 * - Trims leading / trailing hyphens
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")       // remove apostrophes (curly + straight)
    .replace(/\./g, "")          // remove periods
    .replace(/[^a-z0-9\s-]/g, "") // strip remaining special chars
    .replace(/[\s]+/g, "-")     // spaces to hyphens
    .replace(/-+/g, "-")        // collapse consecutive hyphens
    .replace(/^-|-$/g, "");     // trim leading/trailing hyphens
}

/**
 * Generate the canonical slug for a book's recommendation page.
 *
 * Pattern: `books-like-{title}`
 *
 * Example: "The Great Gatsby"
 *       -> "books-like-the-great-gatsby"
 */
export function generateBookSlug(title: string): string {
  return `books-like-${slugify(title)}`;
}
