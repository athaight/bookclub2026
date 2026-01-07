```
 ____   ___   ___  _  __   ____ _    _   _ ____  
| __ ) / _ \ / _ \| |/ /  / ___| |  | | | | __ ) 
|  _ \| | | | | | | ' /  | |   | |  | | | |  _ \ 
| |_) | |_| | |_| | . \  | |___| |__| |_| | |_) |
|____/ \___/ \___/|_|\_\  \____|_____\___/|____/ 
                                                 
 __     _____ ____  _____    ____ ___  ____  _____ 
 \ \   / /_ _| __ )| ____|  / ___/ _ \|  _ \| ____|
  \ \ / / | ||  _ \|  _|   | |  | | | | | | |  _|  
   \ V /  | || |_) | |___  | |__| |_| | |_| | |___ 
    \_/  |___|____/|_____|  \____\___/|____/|_____|
```

# Book Bros Book Club

> *A vibe-coded book club tracker built entirely through AI-assisted development*

## 🎯 What is Vibe Coding?

This project was built using **vibe coding** — a development approach where you describe what you want in natural language and an AI assistant (GitHub Copilot with Claude) writes the code. Instead of manually typing every line, you collaborate with AI to rapidly prototype, iterate, and build features conversationally.

**This entire codebase was vibe-coded.** From the initial setup to accessibility audits, every feature was implemented through natural language prompts and AI-generated code. (small interventions and manual coding needed with lower models (e.g., chatGPT 4.1) as it made bad choices or instituted bad patterns) - Main AI used: Claude: Opus 4.5, Sonnet 4 & 4.1) 

## 🚀 The Product

**[bookbrosbookclub.com](https://bookbrosbookclub.com/)**

**Book Bros Book Club** is a private book club tracker for a group of friends to:
- Track reading progress with a **2026 Reading Challenge** (who can read the most books in 2026)
- Share **Top Ten** favorite books with drag-and-drop ranking
- Manage personal **Libraries** with ratings and notes
- Write and publish **Book Reports**
- Celebrate a rotating **Book of the Month** pick
- View member **Profiles** with reading stats and wishlists

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router & Turbopack |
| **TypeScript** | Type-safe development |
| **Material UI** | Component library & theming |
| **Supabase** | PostgreSQL database, auth, and file storage |
| **Open Library API** | Book search and metadata |
| **Google Books API** | Fallback book data and covers |
| **Vercel** | Hosting and deployment |

## ✨ Features

- 📚 **Reading Challenge** — Track books read toward yearly goal with progress visualization
- 🏆 **Top Tens** — Drag-and-drop ranked lists of favorite books
- 📖 **Libraries** — Personal book collections with ratings, comments, and genres
- ✍️ **Book Reports** — Rich text book reviews with word counts and reading time
- 📅 **Book of the Month** — Rotating picker system with book summaries
- 👤 **Profiles** — Member stats, currently reading, and wishlists
- ♿ **Accessibility** — WCAG 2.1 AA compliant with skip links, ARIA labels, and keyboard navigation
- 🔍 **Smart Book Search** — Author detection, deduplication, and multi-API fallback

## 📋 TL;DR

Book Bros is a **full-stack book club app** built entirely through vibe coding with AI assistance. Three friends track their reading, rate books, write reports, and pick monthly reads together.

**The stack:** Next.js 16 + TypeScript + MUI + Supabase + Vercel

**Key pages:**
- `/reading-challenge` — 2026 reading goal tracker (26 books)
- `/top-tens` — Ranked favorite books with drag-and-drop
- `/libraries` — Personal book collections with ratings
- `/book-report` — Book reviews and reports
- `/book-of-the-month` — Monthly rotating book picks
- `/profiles` — Member profiles with reading stats
- `/admin` — Member authentication and management

**Notable implementation details:**
- Book search uses Open Library with Google Books fallback
- Cover images stored in Supabase Storage buckets
- Real-time data with Supabase client
- Responsive design with mobile navigation drawer
- Full keyboard navigation and screen reader support

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY=your_google_books_api_key
NEXT_PUBLIC_MEMBERS_JSON=[{"email":"...","name":"..."}]
```

## Deploy

Deploy on [Vercel](https://vercel.com) — just connect your repo and add environment variables.

---

*Built with ❤️*
