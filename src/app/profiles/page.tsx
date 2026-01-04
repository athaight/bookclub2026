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
import Tooltip from "@mui/material/Tooltip";
import { getMembers } from "@/lib/members";
import { useProfiles } from "@/lib/useProfiles";
import { supabase } from "@/lib/supabaseClient";
import { BookRow } from "@/types";
import { searchBooks, BookSearchResult } from "@/lib/bookSearch";

type Member = { email: string; name: string };

const normEmail = (s: string) => s.trim().toLowerCase();

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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
    const rankLabel = rankIndex === 0 ? "Bibliophile" : rankIndex === 1 ? "Bookworm" : "Bookish";
    
    // Library stats
    const libraryBooks = books.filter((b) => b.in_library);
    
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
      rankLabel,
      monthlyData,
      totalLibraryBooks: libraryBooks.length,
      genres: sortedGenres,
      wishlistBooks,
    };
  }, [selectedMember, memberBooks, members]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
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
                sx={{
                  width: { xs: 120, sm: 180, md: 250 },
                  height: { xs: 120, sm: 180, md: 250 },
                  fontSize: { xs: 40, sm: 60, md: 80 },
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
                variant="h5"
                component="h2"
                sx={{
                  mt: 2,
                  fontWeight: 600,
                  color: isSelected ? "primary.main" : "text.primary",
                  fontSize: { xs: "1.1rem", sm: "1.5rem" },
                }}
              >
                {m.name}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 4 }} />

      {/* Instructions Header */}
      {!selectedMember && (
        <Typography
          variant="h6"
          align="center"
          sx={{ color: "text.secondary", mb: 4 }}
        >
          Click a user to see their stats
        </Typography>
      )}

      {/* Stats Section */}
      {selectedMember && stats && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Reading Challenge Card */}
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <MenuBookIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  2026 Reading Challenge
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Current ranking:
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                {stats.rankLabel}
              </Typography>
              
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {/* Current Book */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  {stats.currentBooks.length > 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Currently Reading ({stats.currentBooks.length})
                      </Typography>
                      {stats.currentBooks.map((book) => (
                        <Box key={book.id} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          {book.cover_url && (
                            <Avatar
                              src={book.cover_url}
                              variant="rounded"
                              sx={{ width: 50, height: 75, flexShrink: 0 }}
                            />
                          )}
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {book.title}
                            </Typography>
                            {book.author && (
                              <Typography variant="body2" color="text.secondary">
                                by {book.author}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      No current book
                    </Typography>
                  )}
                </Box>

                {/* Vertical Divider */}
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                {/* Books Read Count */}
                <Box sx={{ textAlign: "center", minWidth: 100 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 700,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {stats.booksRead}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    books read
                  </Typography>
                </Box>
              </Box>

              {/* Monthly Reading Chart */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Books Completed by Month
              </Typography>
              <Box sx={{ width: "100%", height: 250 }}>
                <BarChart
                  xAxis={[
                    {
                      scaleType: "band",
                      data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                    },
                  ]}
                  series={[
                    {
                      data: stats.monthlyData,
                      color: "#667eea",
                    },
                  ]}
                  height={250}
                  margin={{ top: 20, bottom: 30, left: 40, right: 20 }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Library Stats Card */}
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <LibraryBooksIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Library Stats
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Books
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {stats.totalLibraryBooks}
                </Typography>
              </Box>

              {/* Genre Pie Chart */}
              {stats.genres.length > 0 && (
                <Box sx={{ mb: "24px" }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Genre Distribution
                  </Typography>
                  
                  {/* Shared color palette for chart and legend */}
                  {(() => {
                    const genreColors = [
                      "#02b2af", "#2e96ff", "#b800d8", "#60009b", "#2731c8",
                      "#03008d", "#ff6f00", "#4caf50", "#f44336", "#9c27b0"
                    ];
                    
                    return (
                      <>
                        {/* Pie Chart - centered, no legend */}
                        <Box sx={{ width: "100%", height: 200, display: "flex", justifyContent: "center" }}>
                          <PieChart
                            series={[
                              {
                                data: stats.genres.map(([genre, count], index) => ({
                                  id: index,
                                  value: count,
                                  color: genreColors[index % genreColors.length],
                                })),
                                innerRadius: 25,
                                outerRadius: 80,
                                paddingAngle: 2,
                                cornerRadius: 5,
                              },
                            ]}
                            width={200}
                            height={200}
                          />
                        </Box>
                        
                        {/* Custom Legend - wraps naturally */}
                        <Box 
                          sx={{ 
                            display: "flex", 
                            flexWrap: "wrap", 
                            gap: 1,
                            justifyContent: "center",
                            mt: "24px",
                          }}
                        >
                          {stats.genres.map(([genre, count], index) => (
                            <Box 
                              key={genre} 
                              sx={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: 0.5,
                                px: 1,
                                py: 0.5,
                              }}
                            >
                              <Box 
                                sx={{ 
                                  width: 12, 
                                  height: 12, 
                                  borderRadius: "50%", 
                                  backgroundColor: genreColors[index % genreColors.length],
                                  flexShrink: 0,
                                }} 
                              />
                              <Typography variant="body2" sx={{ fontSize: 12 }}>
                                {genre} ({count})
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              )}

              {/* Genre Chips */}
              {/* Genre Chips removed: legend now shows the count */}

              {stats.genres.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No genre data available yet. Genres are captured when new books are added.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Wishlist Section */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MenuBookIcon /> Books I Want to Read
              </Typography>

              {/* Search - only show if viewing own profile */}
              {authedEmail === selectedMember?.email && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
                    Search for a book to add to your list
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      placeholder="Search by title or author..."
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
                    <Box sx={{ mt: 1, maxHeight: 350, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                      {wishlistSearchLoading ? (
                        <Box sx={{ p: 2, textAlign: "center" }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : wishlistSearchResults.length > 0 ? (
                        <>
                          <List dense disablePadding>
                            {wishlistSearchResults.map((book, index) => (
                              <ListItemButton
                                key={`${book.title}-${book.author}-${index}`}
                                onClick={() => addToWishlist(book)}
                                disabled={addingWishlist}
                              >
                                {book.coverUrl && (
                                  <Avatar
                                    src={book.coverUrl}
                                    variant="rounded"
                                    sx={{ width: 28, height: 42, mr: 1.5 }}
                                  />
                                )}
                                <ListItemText
                                  primary={book.title}
                                  secondary={book.author || "Unknown author"}
                                  primaryTypographyProps={{ noWrap: true, variant: "body2" }}
                                  secondaryTypographyProps={{ noWrap: true }}
                                />
                                <AddIcon color="primary" />
                              </ListItemButton>
                            ))}
                          </List>
                          {hasMoreResults && (
                            <Box sx={{ p: 1, textAlign: "center", borderTop: "1px solid", borderColor: "divider" }}>
                              <Button
                                size="small"
                                onClick={handleLoadMoreResults}
                                disabled={loadingMoreResults}
                                startIcon={loadingMoreResults ? <CircularProgress size={14} /> : null}
                              >
                                {loadingMoreResults ? "Loading..." : "Load more results"}
                              </Button>
                            </Box>
                          )}
                        </>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {stats.wishlistBooks.map((book) => (
                    <Card key={book.id} variant="outlined" sx={{ display: "flex", alignItems: "center", p: 1.5 }}>
                      {book.cover_url && (
                        <Avatar
                          src={book.cover_url}
                          variant="rounded"
                          sx={{ width: 50, height: 75, flexShrink: 0, mr: 2 }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                          {book.title}
                        </Typography>
                        {book.author && (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            by {book.author}
                          </Typography>
                        )}
                        {book.genre && (
                          <Chip label={book.genre} size="small" sx={{ mt: 0.5 }} />
                        )}
                      </Box>
                      {authedEmail === selectedMember?.email && (
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Move to library">
                            <IconButton
                              onClick={() => promptMoveToLibrary(book)}
                              size="small"
                              color="primary"
                              aria-label="Move to library"
                            >
                              <LocalLibraryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove from wishlist">
                            <IconButton
                              onClick={() => removeFromWishlist(book.id)}
                              size="small"
                              color="error"
                              aria-label="Remove from wishlist"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No books on the wishlist yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
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
