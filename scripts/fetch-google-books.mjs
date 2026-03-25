import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'f1038281',
  dataset: 'production',
  apiVersion: '2026-03-25',
  token: 'skdHVW8PO1bZMI9rr4zldpqTqc5p1fXobDJWYRYTU6bx64h6arIdlEXJkSWOXBbbpuZPtaNK9psG3oE9bb9bZcfTS8zjehjRjn1Wi8Y5olLQKROVciSA7svRlMBqFFIQsXENbB2bIw4v2iS3rjblxidsqsB4dAVyB00VFpTeJemjfzKLF9eV',
  useCdn: false,
});

async function fetchGoogleBooks(query) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.totalItems > 0 && data.items?.[0]?.volumeInfo) {
      return data.items[0].volumeInfo;
    }
  } catch (e) {
    console.error(`  API error: ${e.message}`);
  }
  return null;
}

async function main() {
  // Get all books
  const books = await client.fetch(`*[_type == "book"]{_id, title, isbn, "authorName": author->name, pageCount, publisher, publishedDate, "hasCover": defined(coverImage)} | order(title asc)`);

  console.log(`Found ${books.length} books. Fetching metadata...\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];

    // Skip if already has all metadata
    if (book.pageCount && book.publisher && book.publishedDate) {
      skipped++;
      continue;
    }

    // Try ISBN first, then title+author
    let query = book.isbn ? `isbn:${book.isbn}` : `intitle:${book.title}+inauthor:${book.authorName || ''}`;

    console.log(`[${i + 1}/${books.length}] ${book.title}...`);

    const info = await fetchGoogleBooks(query);

    // If ISBN lookup failed, try title+author
    if (!info && book.isbn) {
      const fallbackQuery = `intitle:${book.title}+inauthor:${book.authorName || ''}`;
      const fallbackInfo = await fetchGoogleBooks(fallbackQuery);
      if (fallbackInfo) {
        await patchBook(book, fallbackInfo);
        updated++;
        continue;
      }
    }

    if (!info) {
      console.log(`  NOT FOUND`);
      notFound++;
      continue;
    }

    await patchBook(book, info);
    updated++;

    // Rate limit: small delay between requests
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone! Updated: ${updated}, Skipped (already had data): ${skipped}, Not found: ${notFound}`);
}

async function patchBook(book, info) {
  const patch = {};

  if (!book.pageCount && info.pageCount) {
    patch.pageCount = info.pageCount;
  }
  if (!book.publisher && info.publisher) {
    patch.publisher = info.publisher;
  }
  if (!book.publishedDate && info.publishedDate) {
    patch.publishedDate = info.publishedDate;
  }

  // Get ISBN if missing
  if (!book.isbn && info.industryIdentifiers) {
    const isbn13 = info.industryIdentifiers.find(id => id.type === 'ISBN_13');
    const isbn10 = info.industryIdentifiers.find(id => id.type === 'ISBN_10');
    if (isbn13) patch.isbn = isbn13.identifier;
    else if (isbn10) patch.isbn = isbn10.identifier;
  }

  if (Object.keys(patch).length === 0) {
    console.log(`  No new data to update`);
    return;
  }

  try {
    await client.patch(book._id).set(patch).commit();
    console.log(`  Updated: ${Object.keys(patch).join(', ')}`);
  } catch (e) {
    console.error(`  Patch error: ${e.message}`);
  }
}

main().catch(console.error);
