// Backfill script to populate page counts for existing books
// Run with: npx tsx scripts/backfill-pages.ts

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for admin access

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPageCount(title: string, author?: string): Promise<number | null> {
  try {
    // Try Open Library first
    const query = author ? `${title} ${author}` : title;
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=title,author_name,number_of_pages_median`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.docs?.[0]?.number_of_pages_median) {
        return data.docs[0].number_of_pages_median;
      }
    }

    // Fallback to Google Books
    const googleResponse = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`
    );

    if (googleResponse.ok) {
      const googleData = await googleResponse.json();
      if (googleData.items?.[0]?.volumeInfo?.pageCount) {
        return googleData.items[0].volumeInfo.pageCount;
      }
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch page count for "${title}":`, error);
    return null;
  }
}

async function backfillPages() {
  console.log("🔍 Fetching books without page counts...\n");

  // Get all books that don't have a page count
  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author")
    .is("pages", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching books:", error);
    process.exit(1);
  }

  if (!books || books.length === 0) {
    console.log("✅ All books already have page counts!");
    return;
  }

  console.log(`📚 Found ${books.length} books without page counts\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] Looking up: "${book.title}" by ${book.author || "Unknown"}`);

    const pages = await fetchPageCount(book.title, book.author);

    if (pages) {
      const { error: updateError } = await supabase
        .from("books")
        .update({ pages })
        .eq("id", book.id);

      if (updateError) {
        console.log(`   ❌ Failed to update: ${updateError.message}`);
        failed++;
      } else {
        console.log(`   ✅ Updated: ${pages} pages`);
        updated++;
      }
    } else {
      console.log(`   ⚠️  No page count found`);
      failed++;
    }

    // Rate limiting: wait 500ms between API calls to avoid hitting rate limits
    await sleep(500);
  }

  console.log("\n" + "=".repeat(50));
  console.log(`📊 Results:`);
  console.log(`   ✅ Updated: ${updated} books`);
  console.log(`   ⚠️  No data found: ${failed} books`);
  console.log("=".repeat(50));
}

backfillPages();
