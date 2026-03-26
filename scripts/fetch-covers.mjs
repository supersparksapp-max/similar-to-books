import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'f1038281',
  dataset: 'production',
  apiVersion: '2026-03-25',
  token: 'skdHVW8PO1bZMI9rr4zldpqTqc5p1fXobDJWYRYTU6bx64h6arIdlEXJkSWOXBbbpuZPtaNK9psG3oE9bb9bZcfTS8zjehjRjn1Wi8Y5olLQKROVciSA7svRlMBqFFIQsXENbB2bIw4v2iS3rjblxidsqsB4dAVyB00VFpTeJemjfzKLF9eV',
  useCdn: false,
});

async function getOpenLibraryCover(title, authorName) {
  try {
    const query = authorName ? `${title} ${authorName}` : title;
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3`);
    const data = await res.json();
    if (data.docs?.length > 0) {
      for (const doc of data.docs) {
        if (doc.cover_i) {
          return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        }
      }
    }
  } catch (e) { /* fall through */ }
  return null;
}

async function getGoogleBooksImageUrl(title, authorName, isbn) {
  // Try ISBN first with Google
  if (isbn) {
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`);
      const data = await res.json();
      if (data.items?.[0]?.volumeInfo?.imageLinks) {
        const links = data.items[0].volumeInfo.imageLinks;
        const url = links.extraLarge || links.large || links.medium || links.small || links.thumbnail;
        if (url) return url.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=3');
      }
    } catch (e) { /* fall through */ }
  }

  // Try title + author with Google
  try {
    const query = `intitle:${title}${authorName ? `+inauthor:${authorName}` : ''}`;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`);
    const data = await res.json();
    if (data.items?.[0]?.volumeInfo?.imageLinks) {
      const links = data.items[0].volumeInfo.imageLinks;
      const url = links.extraLarge || links.large || links.medium || links.small || links.thumbnail;
      if (url) return url.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=3');
    }
  } catch (e) { /* fall through */ }

  // Fallback: Open Library
  const olUrl = await getOpenLibraryCover(title, authorName);
  if (olUrl) return olUrl;

  return null;
}

async function uploadImageToSanity(imageUrl, filename) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const asset = await client.assets.upload('image', Buffer.from(buffer), {
    filename: `${filename}.jpg`,
  });
  return asset;
}

async function main() {
  const books = await client.fetch(`
    *[_type == "book" && !defined(coverImage)]{
      _id, title, isbn, "authorName": author->name
    } | order(title asc)
  `);

  console.log(`Found ${books.length} books without cover images.\n`);

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] ${book.title}...`);

    const imageUrl = await getGoogleBooksImageUrl(book.title, book.authorName, book.isbn);

    if (!imageUrl) {
      console.log(`  No image found`);
      failed++;
      continue;
    }

    try {
      const slugName = book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const asset = await uploadImageToSanity(imageUrl, slugName);

      await client.patch(book._id).set({
        coverImage: {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: asset._id,
          },
        },
      }).commit();

      console.log(`  Uploaded and set cover image`);
      uploaded++;
    } catch (e) {
      console.log(`  Error: ${e.message}`);
      failed++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone! Uploaded: ${uploaded}, Failed: ${failed}`);
}

main().catch(console.error);
