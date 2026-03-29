import { sanityClient } from "sanity:client";
import { defineQuery } from "groq";

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

const publishedBooksQuery = defineQuery(`
  *[_type == "book" && status == "published"] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    coverImage,
    isbn,
    description,
    publishedDate,
    publisher,
    pageCount,
    amazonAffiliateLink,
    seoTitle,
    seoDescription,
    author->{ _id, name, "slug": slug.current },
    genres[]->{ _id, name, "slug": slug.current },
    tags[]->{ _id, name, "slug": slug.current },
    series->{ _id, name, "slug": slug.current },
    seriesOrder
  }
`);

export async function getPublishedBooks() {
  return sanityClient.fetch(publishedBooksQuery);
}

const bookBySlugQuery = defineQuery(`
  *[_type == "book" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    coverImage,
    isbn,
    description,
    publishedDate,
    publisher,
    pageCount,
    amazonAffiliateLink,
    status,
    seoTitle,
    seoDescription,
    introContent,
    author->{ _id, name, "slug": slug.current },
    genres[]->{ _id, name, "slug": slug.current },
    tags[]->{ _id, name, "slug": slug.current },
    series->{ _id, name, "slug": slug.current },
    seriesOrder,
    recommendations[] | order(rank asc) {
      _key,
      writeup,
      rank,
      commonElements,
      book->{
        _id,
        title,
        "slug": slug.current,
        coverImage,
        isbn,
        description,
        publishedDate,
        publisher,
        pageCount,
        amazonAffiliateLink,
        status,
        author->{ _id, name, "slug": slug.current },
        genres[]->{ _id, name, "slug": slug.current }
      }
    }
  }
`);

export async function getBookBySlug(slug: string) {
  return sanityClient.fetch(bookBySlugQuery, { slug });
}

// ---------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------

const allAuthorsQuery = defineQuery(`
  *[_type == "author" && count(*[_type == "book" && status == "published" && author._ref == ^._id]) > 0] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    bio,
    image,
    seoTitle,
    seoDescription
  }
`);

export async function getAllAuthors() {
  return sanityClient.fetch(allAuthorsQuery);
}

const authorBySlugQuery = defineQuery(`
  *[_type == "author" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    bio,
    image,
    seoTitle,
    seoDescription,
    "books": *[_type == "book" && author._ref == ^._id] | order(title asc) {
      _id,
      title,
      "slug": slug.current,
      coverImage,
      description,
      amazonAffiliateLink,
      status,
      genres[]->{ _id, name, "slug": slug.current }
    }
  }
`);

export async function getAuthorBySlug(slug: string) {
  return sanityClient.fetch(authorBySlugQuery, { slug });
}

// ---------------------------------------------------------------------------
// Genres
// ---------------------------------------------------------------------------

const allGenresQuery = defineQuery(`
  *[_type == "genre"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    seoTitle,
    seoDescription
  }
`);

export async function getAllGenres() {
  return sanityClient.fetch(allGenresQuery);
}

const genreBySlugQuery = defineQuery(`
  *[_type == "genre" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    seoTitle,
    seoDescription,
    "books": *[_type == "book" && $slug in genres[]->slug.current && status == "published"] | order(title asc) {
      _id,
      title,
      "slug": slug.current,
      coverImage,
      description,
      amazonAffiliateLink,
      author->{ _id, name, "slug": slug.current },
      genres[]->{ _id, name, "slug": slug.current }
    }
  }
`);

export async function getGenreBySlug(slug: string) {
  return sanityClient.fetch(genreBySlugQuery, { slug });
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

const allSeriesQuery = defineQuery(`
  *[_type == "series"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    seoTitle,
    seoDescription
  }
`);

export async function getAllSeries() {
  return sanityClient.fetch(allSeriesQuery);
}

const seriesBySlugQuery = defineQuery(`
  *[_type == "series" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    seoTitle,
    seoDescription,
    "books": *[_type == "book" && series._ref == ^._id] | order(seriesOrder asc) {
      _id,
      title,
      "slug": slug.current,
      coverImage,
      description,
      amazonAffiliateLink,
      seriesOrder,
      status,
      author->{ _id, name, "slug": slug.current },
      genres[]->{ _id, name, "slug": slug.current }
    }
  }
`);

export async function getSeriesBySlug(slug: string) {
  return sanityClient.fetch(seriesBySlugQuery, { slug });
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

const allTagsQuery = defineQuery(`
  *[_type == "tag"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    seoTitle,
    seoDescription
  }
`);

export async function getAllTags() {
  return sanityClient.fetch(allTagsQuery);
}

const tagBySlugQuery = defineQuery(`
  *[_type == "tag" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    seoTitle,
    seoDescription,
    "books": *[_type == "book" && $slug in tags[]->slug.current && status == "published"] | order(title asc) {
      _id,
      title,
      "slug": slug.current,
      coverImage,
      description,
      amazonAffiliateLink,
      author->{ _id, name, "slug": slug.current },
      genres[]->{ _id, name, "slug": slug.current },
      tags[]->{ _id, name, "slug": slug.current }
    }
  }
`);

export async function getTagBySlug(slug: string) {
  return sanityClient.fetch(tagBySlugQuery, { slug });
}
