import type { APIRoute } from "astro";
import { sanityClient } from "sanity:client";

export const GET: APIRoute = async () => {
  const books = await sanityClient.fetch(
    `*[_type == "book" && status == "published"]{
      title,
      slug,
      "authorName": author->name,
      publishedDate,
      "coverUrl": coverImage.asset->url,
    }|order(title asc)`
  );

  const index = books.map((book: any) => ({
    t: book.title,
    s: book.slug,
    a: book.authorName || "",
    y: book.publishedDate ? new Date(book.publishedDate).getFullYear() : null,
    c: book.coverUrl
      ? book.coverUrl + "?w=96&h=144&fit=crop&auto=format"
      : null,
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
