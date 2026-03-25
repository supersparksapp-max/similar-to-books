import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'f1038281',
  dataset: 'production',
  apiVersion: '2026-03-25',
  token: 'skdHVW8PO1bZMI9rr4zldpqTqc5p1fXobDJWYRYTU6bx64h6arIdlEXJkSWOXBbbpuZPtaNK9psG3oE9bb9bZcfTS8zjehjRjn1Wi8Y5olLQKROVciSA7svRlMBqFFIQsXENbB2bIw4v2iS3rjblxidsqsB4dAVyB00VFpTeJemjfzKLF9eV',
  useCdn: false,
});

async function getCoverUrl(title, authorName, isbn) {
  // Try ISBN via Open Library first
  if (isbn) {
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok && res.headers.get('content-type')?.includes('image')) {
        return url;
      }
    } catch (e) { /* fall through */ }
  }

  // Try searching Open Library by title+author
  try {
    const query = `${title} ${authorName || ''}`.trim();
    const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=cover_i,isbn`;
    const res = await fetch(searchUrl);
    const data = await res.json();

    if (data.docs?.[0]?.cover_i) {
      return `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`;
    }

    // Try with ISBN from search results
    if (data.docs?.[0]?.isbn?.[0]) {
      return `https://covers.openlibrary.org/b/isbn/${data.docs[0].isbn[0]}-L.jpg`;
    }
  } catch (e) { /* fall through */ }

  return null;
}

async function uploadImageToSanity(imageUrl, filename) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('image')) throw new Error(`Not an image: ${contentType}`);
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 1000) throw new Error('Image too small (likely placeholder)');
  const asset = await client.assets.upload('image', Buffer.from(buffer), { filename: `${filename}.jpg` });
  return asset;
}

async function main() {
  const books = await client.fetch(`
    *[_type == "book" && !defined(coverImage)]{
      _id, title, isbn, "authorName": author->name
    } | order(title asc)
  `);

  console.log(`Found ${books.length} books still missing covers.\n`);

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] ${book.title}...`);

    const coverUrl = await getCoverUrl(book.title, book.authorName, book.isbn);

    if (!coverUrl) {
      console.log(`  No cover found`);
      failed++;
      continue;
    }

    try {
      const slugName = book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const asset = await uploadImageToSanity(coverUrl, slugName);

      await client.patch(book._id).set({
        coverImage: {
          _type: 'image',
          asset: { _type: 'reference', _ref: asset._id },
        },
      }).commit();

      console.log(`  Uploaded cover`);
      uploaded++;
    } catch (e) {
      console.log(`  Error: ${e.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone! Uploaded: ${uploaded}, Failed: ${failed}`);
}

main().catch(console.error);
