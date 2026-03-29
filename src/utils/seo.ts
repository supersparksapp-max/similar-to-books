import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const builder = imageUrlBuilder({
  projectId: "f1038281",
  dataset: "production",
});

/**
 * Build a CDN URL for a Sanity image asset.
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// ---------------------------------------------------------------------------
// Shared types used across generators
// ---------------------------------------------------------------------------

interface BookForSchema {
  title: string;
  slug: string;
  description?: string;
  isbn?: string;
  coverImage?: SanityImageSource;
  author?: { name: string; slug: string };
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  genres?: Array<{ name: string; slug: string }>;
  amazonAffiliateLink?: string;
}

interface RecommendationForSchema {
  book: BookForSchema;
  writeup?: string;
  rank?: number;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

const currentYear = new Date().getFullYear();

// ---------------------------------------------------------------------------
// schema.org/Book
// ---------------------------------------------------------------------------

export function generateBookSchema(book: BookForSchema) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    description: book.description ?? "",
    url: `https://www.similartobooks.com/discover/${book.slug}`,
  };

  if (book.isbn) {
    schema.isbn = book.isbn;
  }

  if (book.author) {
    schema.author = {
      "@type": "Person",
      name: book.author.name,
      url: `https://www.similartobooks.com/author/${book.author.slug}`,
    };
  }

  if (book.coverImage) {
    schema.image = urlFor(book.coverImage).width(600).url();
  }

  if (book.publisher) {
    schema.publisher = {
      "@type": "Organization",
      name: book.publisher,
    };
  }

  if (book.publishedDate) {
    schema.datePublished = book.publishedDate;
  }

  if (book.pageCount) {
    schema.numberOfPages = book.pageCount;
  }

  if (book.genres && book.genres.length > 0) {
    schema.genre = book.genres.map((g) => g.name);
  }

  // Use current date as dateModified
  schema.dateModified = new Date().toISOString().split("T")[0];

  return schema;
}

// ---------------------------------------------------------------------------
// schema.org/ItemList  (for the recommendations listicle)
// ---------------------------------------------------------------------------

export function generateItemListSchema(
  recommendations: RecommendationForSchema[],
  sourceBook?: BookForSchema,
) {
  const listName = sourceBook
    ? `Books Similar to ${sourceBook.title} (${currentYear})`
    : `Book Recommendations (${currentYear})`;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: recommendations.length,
    itemListElement: recommendations.map((rec, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Book",
        name: rec.book.title,
        url: `https://www.similartobooks.com/${rec.book.slug}`,
        description: rec.writeup ?? rec.book.description ?? "",
        ...(rec.book.author
          ? {
              author: {
                "@type": "Person",
                name: rec.book.author.name,
              },
            }
          : {}),
        ...(rec.book.coverImage
          ? { image: urlFor(rec.book.coverImage).width(400).url() }
          : {}),
        ...(rec.book.isbn ? { isbn: rec.book.isbn } : {}),
      },
    })),
  };
}

// ---------------------------------------------------------------------------
// schema.org/BreadcrumbList
// ---------------------------------------------------------------------------

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
