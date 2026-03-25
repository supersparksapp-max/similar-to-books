import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'f1038281',
  dataset: 'production',
  apiVersion: '2026-03-25',
  token: 'skdHVW8PO1bZMI9rr4zldpqTqc5p1fXobDJWYRYTU6bx64h6arIdlEXJkSWOXBbbpuZPtaNK9psG3oE9bb9bZcfTS8zjehjRjn1Wi8Y5olLQKROVciSA7svRlMBqFFIQsXENbB2bIw4v2iS3rjblxidsqsB4dAVyB00VFpTeJemjfzKLF9eV',
  useCdn: false,
});

// Genre name -> Sanity document ID mapping (fetch once)
let genreMap = {};

async function loadGenreMap() {
  const genres = await client.fetch(`*[_type == "genre"]{_id, name}`);
  for (const g of genres) {
    genreMap[g.name.toLowerCase()] = g._id;
  }
  console.log(`Loaded ${Object.keys(genreMap).length} genres:`, Object.keys(genreMap).join(', '));
}

// Map Google Books categories to our genre names
const categoryToGenre = {
  'fiction': 'fantasy', // fallback, will be overridden by more specific matches
  'fantasy': 'fantasy',
  'science fiction': 'science fiction',
  'sci-fi': 'science fiction',
  'thriller': 'thriller',
  'thrillers': 'thriller',
  'suspense': 'thriller',
  'mystery': 'mystery',
  'mystery & detective': 'mystery',
  'crime': 'crime',
  'true crime': 'crime',
  'romance': 'romance',
  'love & romance': 'romance',
  'historical fiction': 'historical fiction',
  'historical': 'historical fiction',
  'literary fiction': 'literary fiction',
  'literary': 'literary fiction',
  'literary criticism': 'literary fiction',
  'contemporary fiction': 'contemporary fiction',
  'contemporary': 'contemporary fiction',
  'young adult': 'young adult',
  'young adult fiction': 'young adult',
  'juvenile fiction': 'young adult',
  'children': 'young adult',
  'dystopian': 'dystopian',
  'humor': 'comedy',
  'comedy': 'comedy',
  'humorous fiction': 'comedy',
  'satire': 'comedy',
  'self-help': 'self-help',
  'self-improvement': 'self-help',
  'personal development': 'self-help',
  'non-fiction': 'non-fiction',
  'nonfiction': 'non-fiction',
  'biography': 'memoir',
  'biography & autobiography': 'memoir',
  'autobiography': 'memoir',
  'memoir': 'memoir',
  'philosophy': 'philosophy',
  'body, mind & spirit': 'philosophy',
  'religion': 'philosophy',
  'spirituality': 'philosophy',
};

function mapCategoriesToGenreIds(categories) {
  if (!categories || categories.length === 0) return [];

  const matched = new Set();
  for (const cat of categories) {
    const lower = cat.toLowerCase();
    // Check each mapping
    for (const [keyword, genreName] of Object.entries(categoryToGenre)) {
      if (lower.includes(keyword)) {
        const genreId = genreMap[genreName];
        if (genreId) matched.add(genreId);
      }
    }
  }
  return [...matched];
}

async function fetchBookInfo(title, authorName, isbn) {
  // Try ISBN first
  if (isbn) {
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`);
      const data = await res.json();
      if (data.items?.[0]?.volumeInfo) return data.items[0].volumeInfo;
    } catch (e) { /* fall through */ }
  }

  // Try Open Library for year
  if (isbn) {
    try {
      const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      if (res.ok) {
        const data = await res.json();
        return { publishedDate: data.publish_date, categories: data.subjects?.slice(0, 5) };
      }
    } catch (e) { /* fall through */ }
  }

  // Try title+author on Google Books
  try {
    const query = `intitle:${title}${authorName ? `+inauthor:${authorName}` : ''}`;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`);
    const data = await res.json();
    if (data.items?.[0]?.volumeInfo) return data.items[0].volumeInfo;
  } catch (e) { /* fall through */ }

  return null;
}

async function main() {
  await loadGenreMap();

  // Get books missing genres OR publishedDate
  const books = await client.fetch(`
    *[_type == "book" && (count(genres) == 0 || !defined(genres) || !defined(publishedDate) || publishedDate == "")]{
      _id, title, isbn, publishedDate, "authorName": author->name,
      "hasGenres": count(genres) > 0
    } | order(title asc)
  `);

  console.log(`\nFound ${books.length} books needing genres or year.\n`);

  let updatedGenres = 0;
  let updatedYear = 0;
  let notFound = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] ${book.title}...`);

    const info = await fetchBookInfo(book.title, book.authorName, book.isbn);

    if (!info) {
      console.log(`  Not found`);
      notFound++;
      continue;
    }

    const patch = {};

    // Genres
    if (!book.hasGenres && info.categories) {
      const genreIds = mapCategoriesToGenreIds(info.categories);
      if (genreIds.length > 0) {
        patch.genres = genreIds.map(id => ({
          _type: 'reference',
          _ref: id,
          _key: id.slice(0, 12),
        }));
        updatedGenres++;
        console.log(`  Genres: ${genreIds.length} matched`);
      }
    }

    // Published date
    if (!book.publishedDate && info.publishedDate) {
      patch.publishedDate = info.publishedDate;
      updatedYear++;
      console.log(`  Year: ${info.publishedDate}`);
    }

    if (Object.keys(patch).length > 0) {
      try {
        await client.patch(book._id).set(patch).commit();
      } catch (e) {
        console.log(`  Patch error: ${e.message}`);
      }
    } else {
      console.log(`  No new data`);
    }

    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\nDone! Genres updated: ${updatedGenres}, Years updated: ${updatedYear}, Not found: ${notFound}`);
}

main().catch(console.error);
