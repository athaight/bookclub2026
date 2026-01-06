"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { getMembers } from "@/lib/members";
import { useProfiles } from "@/lib/useProfiles";
import { supabase } from "@/lib/supabaseClient";
import { BookRow } from "@/types";
import { searchBooks, BookSearchResult } from "@/lib/bookSearch";
import BookCoverImage from "@/components/BookCoverImage";

type Member = { email: string; name: string };

const normEmail = (s: string) => s.trim().toLowerCase();

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

export default function ProfilesPage() {
  const members = useMemo<Member[]>(
    () => getMembers().map((m) => ({ ...m, email: normEmail(m.email) })),
    []
  );

  const { profiles } = useProfiles(members.map((m) => m.email));
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberBooks, setMemberBooks] = useState<Record<string, BookRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  // Wishlist state
  const wishlistSearchInputRef = useRef<HTMLInputElement>(null);
  const [wishlistSearchResults, setWishlistSearchResults] = useState<BookSearchResult[]>([]);
  const [wishlistSearchLoading, setWishlistSearchLoading] = useState(false);
  const [showWishlistResults, setShowWishlistResults] = useState(false);
  const [addingWishlist, setAddingWishlist] = useState(false);
  const [loadingMoreResults, setLoadingMoreResults] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // Wishlist edit dialog state
  const [editWishlistDialogOpen, setEditWishlistDialogOpen] = useState(false);
  const [editingWishlistBook, setEditingWishlistBook] = useState<BookRow | null>(null);
  const [editWishlistTitle, setEditWishlistTitle] = useState("");
  const [editWishlistAuthor, setEditWishlistAuthor] = useState("");
  const [editWishlistCoverUrl, setEditWishlistCoverUrl] = useState<string | null>(null);
  const [pendingWishlistCoverFile, setPendingWishlistCoverFile] = useState<File | null>(null);
  const [savingWishlistEdit, setSavingWishlistEdit] = useState(false);

  // Library confirmation modal state
  const [libraryConfirmOpen, setLibraryConfirmOpen] = useState(false);
  const [bookToMoveToLibrary, setBookToMoveToLibrary] = useState<BookRow | null>(null);
  const [movingToLibrary, setMovingToLibrary] = useState(false);

  // Notification snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error" | "warning" | "info">("info");

  // Helper to check if a book exists in library
  const isBookInLibrary = (title: string, author: string) => {
    if (!selectedMember) return false;
    const userBooks = memberBooks[selectedMember.email] || [];
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedAuthor = (author || "").toLowerCase().trim();
    return userBooks.some(
      (b) =>
        b.in_library &&
        b.title.toLowerCase().trim() === normalizedTitle &&
        (b.author || "").toLowerCase().trim() === normalizedAuthor
    );
  };

  // Get authenticated user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ? normEmail(data.session.user.email) : null;
      setAuthedEmail(email);
    })();
  }, []);

  // Fetch all books for all members
  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .in("member_email", members.map((m) => m.email));

      if (!error && data) {
        const grouped: Record<string, BookRow[]> = {};
        for (const m of members) {
          grouped[m.email] = data.filter((b) => b.member_email === m.email);
        }
        setMemberBooks(grouped);
      }
      setLoading(false);
    }

    if (members.length > 0) {
      fetchBooks();
    }
  }, [members]);

  // Wishlist search handler
  async function handleWishlistSearch() {
    const query = wishlistSearchInputRef.current?.value.trim() || "";
    if (query.length < 3) {
      setWishlistSearchResults([]);
      setShowWishlistResults(false);
      return;
    }

    setWishlistSearchLoading(true);
    setShowWishlistResults(true);
    setHasMoreResults(false);
    setLastSearchQuery(query);

    try {
      const { books, hasMore } = await searchBooks(query, { limit: 30 });
      setWishlistSearchResults(books);
      setHasMoreResults(hasMore);
    } catch (error) {
      console.error("Search error:", error);
      setWishlistSearchResults([]);
    } finally {
      setWishlistSearchLoading(false);
    }
  }

  // Load more search results
  async function handleLoadMoreResults() {
    if (lastSearchQuery.length < 3) return;

    setLoadingMoreResults(true);
    try {
      const { books: moreResults, hasMore } = await searchBooks(lastSearchQuery, { limit: 30, offset: wishlistSearchResults.length });
      if (moreResults.length > 0) {
        // Deduplicate with existing results
        const existingKeys = new Set(wishlistSearchResults.map(b => `${b.title.toLowerCase()}|${(b.author || '').toLowerCase()}`));
        const newResults = moreResults.filter(b => !existingKeys.has(`${b.title.toLowerCase()}|${(b.author || '').toLowerCase()}`));
        setWishlistSearchResults([...wishlistSearchResults, ...newResults]);
        setHasMoreResults(hasMore);
      } else {
        setHasMoreResults(false);
      }
    } catch (error) {
      console.error("Load more error:", error);
    } finally {
      setLoadingMoreResults(false);
    }
  }

  // Add book to wishlist
  async function addToWishlist(book: BookSearchResult) {
    if (!selectedMember || authedEmail !== selectedMember.email) return;

    // Check if book already exists in library
    if (isBookInLibrary(book.title, book.author || "")) {
      setSnackbarMessage(`"${book.title}" is already in your library.`);
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }

    setAddingWishlist(true);
    try {
      const { error } = await supabase.from("books").insert({
        member_email: selectedMember.email,
        status: "wishlist",
        title: book.title,
        author: book.author || "",
        cover_url: book.coverUrl || null,
        genre: book.genre || null,
        reading_challenge_year: new Date().getFullYear(),
        top_ten: false,
        in_library: false,
      });

      if (error) {
        console.error("Supabase error details:", error.message, error.details, error.hint);
        throw error;
      }

      // Refresh books
      const { data } = await supabase
        .from("books")
        .select("*")
        .in("member_email", members.map((m) => m.email));

      if (data) {
        const grouped: Record<string, BookRow[]> = {};
        for (const m of members) {
          grouped[m.email] = data.filter((b) => b.member_email === m.email);
        }
        setMemberBooks(grouped);
      }

      // Clear search
      if (wishlistSearchInputRef.current) {
        wishlistSearchInputRef.current.value = "";
      }
      setWishlistSearchResults([]);
      setShowWishlistResults(false);
    } catch (error) {
      console.error("Error adding to wishlist:", error);
    } finally {
      setAddingWishlist(false);
    }
  }

  // Open confirmation modal for moving to library
  function promptMoveToLibrary(book: BookRow) {
    // Check if a different copy of this book already exists in library
    if (isBookInLibrary(book.title, book.author || "")) {
      setSnackbarMessage(`"${book.title}" is already in your library.`);
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }
    setBookToMoveToLibrary(book);
    setLibraryConfirmOpen(true);
  }

  // Move wishlist book to library (changes status to completed and sets in_library)
  async function confirmMoveToLibrary() {
    if (!bookToMoveToLibrary || !selectedMember || authedEmail !== selectedMember.email) return;

    setMovingToLibrary(true);
    try {
      const { error } = await supabase
        .from("books")
        .update({ in_library: true, status: "completed" })
        .eq("id", bookToMoveToLibrary.id);
      if (error) throw error;

      // Refresh books
      const { data } = await supabase
        .from("books")
        .select("*")
        .in("member_email", members.map((m) => m.email));

      if (data) {
        const grouped: Record<string, BookRow[]> = {};
        for (const m of members) {
          grouped[m.email] = data.filter((b) => b.member_email === m.email);
        }
        setMemberBooks(grouped);
      }

      setLibraryConfirmOpen(false);
      setBookToMoveToLibrary(null);
    } catch (error) {
      console.error("Error moving to library:", error);
    } finally {
      setMovingToLibrary(false);
    }
  }

  // Remove book from wishlist
  async function removeFromWishlist(bookId: string) {
    if (!selectedMember || authedEmail !== selectedMember.email) return;

    try {
      const { error } = await supabase.from("books").delete().eq("id", bookId);
      if (error) throw error;

      // Refresh books
      const { data } = await supabase
        .from("books")
        .select("*")
        .in("member_email", members.map((m) => m.email));

      if (data) {
        const grouped: Record<string, BookRow[]> = {};
        for (const m of members) {
          grouped[m.email] = data.filter((b) => b.member_email === m.email);
        }
        setMemberBooks(grouped);
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    }
  }

  // Open edit dialog for wishlist book
  function openEditWishlistDialog(book: BookRow) {
    setEditingWishlistBook(book);
    setEditWishlistTitle(book.title);
    setEditWishlistAuthor(book.author || "");
    setEditWishlistCoverUrl(book.cover_url || null);
    setPendingWishlistCoverFile(null);
    setEditWishlistDialogOpen(true);
  }

  // Close edit dialog
  function closeEditWishlistDialog() {
    setEditWishlistDialogOpen(false);
    setEditingWishlistBook(null);
    setEditWishlistTitle("");
    setEditWishlistAuthor("");
    setEditWishlistCoverUrl(null);
    setPendingWishlistCoverFile(null);
  }

  // Save wishlist book edits
  async function saveWishlistBookEdit() {
    if (!editingWishlistBook || !selectedMember || authedEmail !== selectedMember.email) return;

    setSavingWishlistEdit(true);
    try {
      let finalCoverUrl = editWishlistCoverUrl;

      // If a new cover file was selected, upload it
      if (pendingWishlistCoverFile) {
        const fileExt = pendingWishlistCoverFile.name.split(".").pop();
        const fileName = `cover_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("book-covers")
          .upload(fileName, pendingWishlistCoverFile, { upsert: true });

        if (uploadError) throw new Error(`Cover upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from("book-covers").getPublicUrl(fileName);
        finalCoverUrl = urlData.publicUrl;
      }

      // Update the book
      const { error } = await supabase
        .from("books")
        .update({
          title: editWishlistTitle.trim(),
          author: editWishlistAuthor.trim() || null,
          cover_url: finalCoverUrl,
        })
        .eq("id", editingWishlistBook.id);

      if (error) throw error;

      // Refresh books
      const { data } = await supabase
        .from("books")
        .select("*")
        .in("member_email", members.map((m) => m.email));

      if (data) {
        const grouped: Record<string, BookRow[]> = {};
        for (const m of members) {
          grouped[m.email] = data.filter((b) => b.member_email === m.email);
        }
        setMemberBooks(grouped);
      }

      closeEditWishlistDialog();
    } catch (error) {
      console.error("Error saving wishlist book:", error);
      setSnackbarMessage("Failed to save changes");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setSavingWishlistEdit(false);
    }
  }

  // Calculate stats for selected member
  const stats = useMemo(() => {
    if (!selectedMember) return null;

    const books = memberBooks[selectedMember.email] || [];
    
    // Reading Challenge stats (2026)
    const challengeBooks = books.filter((b) => b.reading_challenge_year === 2026);
    const currentBooks = challengeBooks.filter((b) => b.status === "current");
    const completedChallengeBooks = challengeBooks.filter((b) => b.status === "completed");
    
    // Calculate monthly reading stats
    const monthlyData = Array(12).fill(0);
    for (const book of completedChallengeBooks) {
      if (book.completed_at) {
        const completedDate = new Date(book.completed_at);
        // Only count books completed in 2026
        if (completedDate.getFullYear() === 2026) {
          const month = completedDate.getMonth(); // 0-11
          monthlyData[month]++;
        }
      }
    }
    
    // Calculate ranking across all members
    const memberScores = members.map((m) => {
      const mBooks = memberBooks[m.email] || [];
      const mChallengeBooks = mBooks.filter((b) => b.reading_challenge_year === 2026 && b.status === "completed");
      return { email: m.email, completedCount: mChallengeBooks.length };
    }).sort((a, b) => b.completedCount - a.completedCount);
    
    const rankIndex = memberScores.findIndex((s) => s.email === selectedMember.email);
    const rankNumber = rankIndex + 1;
    const rankLabel = rankIndex === 0 ? "Bibliophile" : rankIndex === 1 ? "Bookworm" : "Bookish";
    
    // Library stats
    const libraryBooks = books.filter((b) => b.in_library);
    
    // Top Ten books
    const topTenBooks = books
      .filter((b) => b.top_ten)
      .sort((a, b) => (a.top_ten_rank || 99) - (b.top_ten_rank || 99))
      .slice(0, 10);
    
    // Genre counts
    const genreCounts: Record<string, number> = {};
    for (const book of libraryBooks) {
      if (book.genre) {
        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
      }
    }
    
    // Sort genres by count
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 genres

    // Wishlist books
    const wishlistBooks = books.filter((b) => b.status === "wishlist");

    return {
      currentBooks,
      booksRead: completedChallengeBooks.length,
      rankNumber,
      rankLabel,
      monthlyData,
      totalLibraryBooks: libraryBooks.length,
      libraryBooks,
      topTenBooks,
      genres: sortedGenres,
      wishlistBooks,
    };
  }, [selectedMember, memberBooks, members]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Title */}
      <Typography
        variant="h3"
        component="h1"
        align="center"
        sx={{
          fontWeight: 700,
          mb: 4,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Meet the Book Bros
      </Typography>

      {/* Three Members Inline */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: { xs: 2, sm: 4, md: 6 },
          flexWrap: "wrap",
          mb: 4,
        }}
      >
        {members.map((m) => {
          const profile = profiles[m.email];
          const avatarUrl = profile?.avatar_url;
          const isSelected = selectedMember?.email === m.email;

          return (
            <Box
              key={m.email}
              onClick={() => setSelectedMember(m)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                transition: "transform 0.2s ease, opacity 0.2s ease",
                opacity: selectedMember && !isSelected ? 0.5 : 1,
                "&:hover": {
                  transform: "scale(1.05)",
                },
              }}
            >
              <Avatar
                src={avatarUrl || undefined}
                alt={`Profile picture of ${m.name}`}
                sx={{
                  width: { xs: 80, sm: 100, md: 120 },
                  height: { xs: 80, sm: 100, md: 120 },
                  fontSize: { xs: 28, sm: 36, md: 44 },
                  border: isSelected ? "4px solid #667eea" : "4px solid transparent",
                  boxShadow: isSelected
                    ? "0 8px 32px rgba(102, 126, 234, 0.4)"
                    : "0 4px 16px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                {!avatarUrl && getInitials(m.name)}
              </Avatar>
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  mt: 1.5,
                  fontWeight: 600,
                  color: isSelected ? "primary.main" : "text.primary",
                }}
              >
                {getFirstName(m.name)}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Instructions Header */}
      {!selectedMember && (
        <Typography
          variant="h6"
          align="center"
          sx={{ color: "text.secondary", mt: 4 }}
        >
          Click a member to see their dashboard
        </Typography>
      )}

      {/* Dashboard Content */}
      {selectedMember && stats && (
        <>
          {/* Hero Banner */}
          <Card
            sx={{
              mb: 3,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ py: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Avatar
                  src={profiles[selectedMember.email]?.avatar_url || undefined}
                  alt={getFirstName(selectedMember.name)}
                  sx={{
                    width: { xs: 80, sm: 100 },
                    height: { xs: 80, sm: 100 },
                    fontSize: { xs: 32, sm: 40 },
                    border: "3px solid rgba(255,255,255,0.3)",
                  }}
                >
                  {!profiles[selectedMember.email]?.avatar_url && getInitials(selectedMember.name)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getFirstName(selectedMember.name)}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                    <EmojiEventsIcon sx={{ fontSize: 20 }} />
                    <Typography variant="body1">
                      Rank #{stats.rankNumber} • {stats.rankLabel}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Stats Cards Row */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Books Read This Year */}
            <Card sx={{ textAlign: "center" }}>
              <CardContent>
                <CheckCircleIcon sx={{ fontSize: 32, color: "success.main", mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main" }}>
                  {stats.booksRead}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Read in 2026
                </Typography>
              </CardContent>
            </Card>

            {/* Currently Reading */}
            <Card sx={{ textAlign: "center" }}>
              <CardContent>
                <AutoStoriesIcon sx={{ fontSize: 32, color: "primary.main", mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {stats.currentBooks.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reading Now
                </Typography>
              </CardContent>
            </Card>

            {/* Library Size */}
            <Card sx={{ textAlign: "center" }}>
              <CardContent>
                <LibraryBooksIcon sx={{ fontSize: 32, color: "secondary.main", mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: "secondary.main" }}>
                  {stats.totalLibraryBooks}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Library
                </Typography>
              </CardContent>
            </Card>

            {/* Wishlist */}
            <Card sx={{ textAlign: "center" }}>
              <CardContent>
                <BookmarkIcon sx={{ fontSize: 32, color: "warning.main", mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: "warning.main" }}>
                  {stats.wishlistBooks.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Wishlist
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Two Column Layout */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 3,
              mb: 3,
            }}
          >
            {/* Reading Challenge Progress */}
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <MenuBookIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    2026 Reading Challenge
                  </Typography>
                </Box>
                
                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {stats.booksRead} / 26 books
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "grey.200",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${Math.min((stats.booksRead / 26) * 100, 100)}%`,
                        background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </Box>
                </Box>

                {/* Monthly Chart */}
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Books by Month
                </Typography>
                <Box sx={{ width: "100%", height: 180 }}>
                  <BarChart
                    xAxis={[
                      {
                        scaleType: "band",
                        data: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
                      },
                    ]}
                    series={[
                      {
                        data: stats.monthlyData,
                        color: "#667eea",
                      },
                    ]}
                    height={180}
                    margin={{ top: 10, bottom: 25, left: 30, right: 10 }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Currently Reading */}
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <AutoStoriesIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Currently Reading
                  </Typography>
                </Box>

                {stats.currentBooks.length > 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {stats.currentBooks.map((book) => (
                      <Box key={book.id} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <BookCoverImage
                          coverUrl={book.cover_url}
                          title={book.title}
                          author={book.author}
                          genre={book.genre}
                          width={50}
                          height={75}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                            {book.title}
                          </Typography>
                          {book.author && (
                            <Typography variant="body2" color="text.secondary" noWrap>
                              by {book.author}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    No books currently being read
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Link href="/reading-challenge" passHref style={{ textDecoration: "none" }}>
                  <Button
                    variant="text"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ textTransform: "none" }}
                  >
                    View Reading Challenge
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Box>

          {/* Second Row - Wishlist and Genre Stats */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 3,
              mb: 3,
            }}
          >
            {/* Wishlist */}
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <BookmarkIcon color="warning" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Wishlist
                  </Typography>
                </Box>

                {/* Search - only show if viewing own profile */}
                {authedEmail === selectedMember?.email && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        placeholder="Search to add..."
                        fullWidth
                        variant="outlined"
                        size="small"
                        inputRef={wishlistSearchInputRef}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleWishlistSearch();
                          }
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleWishlistSearch}
                        disabled={wishlistSearchLoading}
                        sx={{ minWidth: "auto", px: 2 }}
                      >
                        {wishlistSearchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                      </Button>
                    </Box>

                    {/* Search Results */}
                    {showWishlistResults && (
                      <Box sx={{ mt: 1, maxHeight: 200, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                        {wishlistSearchLoading ? (
                          <Box sx={{ p: 2, textAlign: "center" }}>
                            <CircularProgress size={24} />
                          </Box>
                        ) : wishlistSearchResults.length > 0 ? (
                          <List dense disablePadding>
                            {wishlistSearchResults.slice(0, 5).map((book, index) => (
                              <ListItemButton
                                key={`${book.title}-${book.author}-${index}`}
                                onClick={() => addToWishlist(book)}
                                disabled={addingWishlist}
                              >
                                <ListItemText
                                  primary={book.title}
                                  secondary={book.author || "Unknown author"}
                                  primaryTypographyProps={{ noWrap: true, variant: "body2" }}
                                  secondaryTypographyProps={{ noWrap: true }}
                                />
                                <AddIcon color="primary" fontSize="small" />
                              </ListItemButton>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
                            No results found.
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                {/* Wishlist Books */}
                {stats.wishlistBooks.length > 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 300, overflow: "auto" }}>
                    {stats.wishlistBooks.map((book) => (
                      <Box key={book.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <BookCoverImage
                          coverUrl={book.cover_url}
                          title={book.title}
                          author={book.author}
                          genre={book.genre}
                          variant="small"
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                            {book.title}
                          </Typography>
                          {book.author && (
                            <Typography variant="caption" color="text.secondary" noWrap component="div">
                              {book.author}
                            </Typography>
                          )}
                        </Box>
                        {authedEmail === selectedMember?.email && (
                          <Box sx={{ display: "flex" }}>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEditWishlistDialog(book)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Move to library">
                              <IconButton size="small" color="primary" onClick={() => promptMoveToLibrary(book)}>
                                <LocalLibraryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove">
                              <IconButton size="small" color="error" onClick={() => removeFromWishlist(book.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    No books on wishlist
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Genre Distribution */}
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <LibraryBooksIcon color="secondary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Genre Distribution
                  </Typography>
                </Box>

                {stats.genres.length > 0 ? (
                  (() => {
                    const genreColors = [
                      "#02b2af", "#2e96ff", "#b800d8", "#60009b", "#2731c8",
                      "#03008d", "#ff6f00", "#4caf50", "#f44336", "#9c27b0"
                    ];
                    
                    return (
                      <>
                        <Box sx={{ width: "100%", height: 180, display: "flex", justifyContent: "center" }}>
                          <PieChart
                            series={[
                              {
                                data: stats.genres.map(([genre, count], index) => ({
                                  id: index,
                                  value: count,
                                  color: genreColors[index % genreColors.length],
                                })),
                                innerRadius: 20,
                                outerRadius: 70,
                                paddingAngle: 2,
                                cornerRadius: 4,
                              },
                            ]}
                            width={180}
                            height={180}
                          />
                        </Box>
                        
                        <Box 
                          sx={{ 
                            display: "flex", 
                            flexWrap: "wrap", 
                            gap: 0.5,
                            justifyContent: "center",
                            mt: 2,
                          }}
                        >
                          {stats.genres.map(([genre, count], index) => (
                            <Chip
                              key={genre}
                              label={`${genre} (${count})`}
                              size="small"
                              sx={{
                                bgcolor: genreColors[index % genreColors.length],
                                color: "white",
                                fontSize: 11,
                              }}
                            />
                          ))}
                        </Box>
                      </>
                    );
                  })()
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    No genre data available yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Top Ten Favorites */}
          {stats.topTenBooks.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ pt: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <EmojiEventsIcon color="warning" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Top Ten Favorites
                    </Typography>
                  </Box>
                  <Link href="/top-tens" passHref style={{ textDecoration: "none" }}>
                    <Button
                      variant="text"
                      endIcon={<ArrowForwardIcon />}
                      size="small"
                      sx={{ textTransform: "none" }}
                    >
                      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                        View Top Ten Books
                      </Box>
                      <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                        View all
                      </Box>
                    </Button>
                  </Link>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    overflowX: "auto",
                    pb: 1,
                    pt: 1,
                    px: 1,
                    "&::-webkit-scrollbar": { height: 6 },
                    "&::-webkit-scrollbar-thumb": { bgcolor: "grey.300", borderRadius: 3 },
                  }}
                >
                  {stats.topTenBooks.map((book, index) => (
                    <Box
                      key={book.id}
                      sx={{
                        flexShrink: 0,
                        flex: { xs: "0 0 auto", md: "1 1 0" },
                        textAlign: "center",
                        minWidth: 80,
                        maxWidth: 100,
                      }}
                    >
                      <Box sx={{ position: "relative", display: "inline-block", pt: 1, pl: 1 }}>
                        <BookCoverImage
                          coverUrl={book.cover_url}
                          title={book.title}
                          author={book.author}
                          genre={book.genre}
                          width={60}
                          height={90}
                        />
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            bgcolor: "warning.main",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            boxShadow: 1,
                          }}
                        >
                          {index + 1}
                        </Box>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 0.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {book.title}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Library Preview */}
          {stats.libraryBooks.length > 0 && (
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LibraryBooksIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Library
                    </Typography>
                  </Box>
                  <Link href="/libraries" passHref style={{ textDecoration: "none" }}>
                    <Button
                      variant="text"
                      endIcon={<ArrowForwardIcon />}
                      size="small"
                      sx={{ textTransform: "none" }}
                    >
                      View All ({stats.totalLibraryBooks})
                    </Button>
                  </Link>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    overflowX: "auto",
                    pb: 1,
                    "&::-webkit-scrollbar": { height: 6 },
                    "&::-webkit-scrollbar-thumb": { bgcolor: "grey.300", borderRadius: 3 },
                  }}
                >
                  {stats.libraryBooks.slice(0, 12).map((book) => (
                    <Box 
                      key={book.id} 
                      sx={{ 
                        flexShrink: 0,
                        flex: { xs: "0 0 auto", md: "1 1 0" },
                        display: "flex",
                        justifyContent: "center",
                        minWidth: 50,
                        maxWidth: 70,
                      }}
                    >
                      <BookCoverImage
                        coverUrl={book.cover_url}
                        title={book.title}
                        author={book.author}
                        genre={book.genre}
                        width={50}
                        height={75}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Confirmation Dialog for moving to library */}
      <Dialog
        open={libraryConfirmOpen}
        onClose={() => setLibraryConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Move to Library?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Move <strong>{bookToMoveToLibrary?.title}</strong> to your library? This will remove it from your wishlist.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setLibraryConfirmOpen(false)}
            disabled={movingToLibrary}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmMoveToLibrary}
            variant="contained"
            disabled={movingToLibrary}
            startIcon={movingToLibrary ? <CircularProgress size={16} /> : <LocalLibraryIcon />}
          >
            Move to Library
          </Button>
        </DialogActions>
      </Dialog>

      {loading && selectedMember && (
        <Typography align="center" color="text.secondary">
          Loading stats...
        </Typography>
      )}

      {/* Edit Wishlist Book Dialog */}
      <Dialog
        open={editWishlistDialogOpen}
        onClose={closeEditWishlistDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Wishlist Book</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {/* Cover Image with upload */}
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <BookCoverImage
                coverUrl={editWishlistCoverUrl}
                title={editWishlistTitle}
                width={100}
                height={150}
                editable
                disableModal
                pendingFile={pendingWishlistCoverFile}
                onFileSelect={(file, previewUrl) => {
                  setPendingWishlistCoverFile(file);
                  setEditWishlistCoverUrl(previewUrl);
                }}
              />
            </Box>

            <TextField
              label="Title"
              value={editWishlistTitle}
              onChange={(e) => setEditWishlistTitle(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Author"
              value={editWishlistAuthor}
              onChange={(e) => setEditWishlistAuthor(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditWishlistDialog} disabled={savingWishlistEdit}>
            Cancel
          </Button>
          <Button
            onClick={saveWishlistBookEdit}
            variant="contained"
            disabled={savingWishlistEdit || !editWishlistTitle.trim()}
            startIcon={savingWishlistEdit ? <CircularProgress size={16} /> : null}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
