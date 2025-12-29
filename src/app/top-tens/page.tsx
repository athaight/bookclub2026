"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  ListItemButton,
  Avatar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { BookRow } from "@/types";
import { searchBooks, BookSearchResult } from "@/lib/bookSearch";
import StarRating from "@/components/StarRating";

const normEmail = (s: string) => s.trim().toLowerCase();

export default function TopTensPage() {
  const members = getMembers().map((m) => ({ ...m, email: normEmail(m.email) }));
  const [topTenBooks, setTopTenBooks] = useState<Record<string, BookRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form state for adding books
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formCoverUrl, setFormCoverUrl] = useState<string | null>(null);
  const [formRating, setFormRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Book search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<BookRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchTopTenBooks() {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("top_ten", true)
        .in("member_email", members.map((m) => m.email))
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching top ten books:", error);
        setLoading(false);
        return;
      }

      // Group books by member email and take only the first 10 for each
      const grouped: Record<string, BookRow[]> = {};
      members.forEach((member) => {
        grouped[member.email] = data
          ?.filter((book) => book.member_email === member.email)
          .slice(0, 10) || [];
      });

      setTopTenBooks(grouped);
      setLoading(false);
    }

    fetchTopTenBooks();
  }, [members]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ? normEmail(data.session.user.email) : null;

      if (!mounted) return;

      if (email) {
        const allowed = members.some((m) => m.email === email);
        if (!allowed) {
          setAuthedEmail(null);
        } else {
          setAuthedEmail(email);
        }
      } else {
        setAuthedEmail(null);
      }

      setCheckingSession(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const email = session?.user?.email ? normEmail(session.user.email) : null;
      if (email) {
        const allowed = members.some((m) => m.email === email);
        if (!allowed) {
          setAuthedEmail(null);
        } else {
          setAuthedEmail(email);
        }
      } else {
        setAuthedEmail(null);
      }
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [members]);

  // Search for books
  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    setShowResults(true);

    try {
      const results = await searchBooks(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Select a book from search results
  const handleSelectBook = (book: BookSearchResult) => {
    setFormTitle(book.title);
    setFormAuthor(book.author);
    setFormCoverUrl(book.coverUrl || null);
    setSearchResults([]);
    setShowResults(false);
    setSearchQuery("");
  };

  // Reset dialog state when opening/closing
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setFormTitle("");
    setFormAuthor("");
    setFormComment("");
    setFormCoverUrl(null);
    setFormRating(null);
  };

  const handleAddBook = async () => {
    if (!authedEmail) return;

    const title = formTitle.trim();
    const author = formAuthor.trim();
    const comment = formComment.trim();

    if (!title) {
      alert("Title is required.");
      return;
    }

    if (!formRating) {
      alert("Rating is required for Top Ten books.");
      return;
    }

    // Check if user already has 10 books
    const userBooks = topTenBooks[authedEmail] || [];
    if (userBooks.length >= 10) {
      alert("You can only have 10 books in your top ten list.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("books").insert({
        member_email: authedEmail,
        status: "completed",
        title,
        author: author || "",
        comment: comment || "",
        cover_url: formCoverUrl || null,
        top_ten: true,
        in_library: true,
        rating: formRating,
        // Don't set completed_at for top ten books - they're not reading completions
      });

      if (error) throw new Error(error.message);

      // Reset form
      setFormTitle("");
      setFormAuthor("");
      setFormComment("");
      setFormCoverUrl(null);
      setFormRating(null);
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);
      setDialogOpen(false);

      // Refresh the data
      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("top_ten", true)
        .in("member_email", members.map((m) => m.email))
        .order("created_at", { ascending: false });

      const grouped: Record<string, BookRow[]> = {};
      members.forEach((member) => {
        grouped[member.email] = data
          ?.filter((book) => book.member_email === member.email)
          .slice(0, 10) || [];
      });

      setTopTenBooks(grouped);
    } catch (e) {
      alert(`Error saving book: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete book
  const handleDeleteClick = (book: BookRow) => {
    setBookToDelete(book);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", bookToDelete.id);

      if (error) throw new Error(error.message);

      // Refresh the data
      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("top_ten", true)
        .in("member_email", members.map((m) => m.email))
        .order("created_at", { ascending: false });

      const grouped: Record<string, BookRow[]> = {};
      members.forEach((member) => {
        grouped[member.email] = data
          ?.filter((book) => book.member_email === member.email)
          .slice(0, 10) || [];
      });

      setTopTenBooks(grouped);
      setDeleteDialogOpen(false);
      setBookToDelete(null);
    } catch (e) {
      alert(`Error deleting book: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setBookToDelete(null);
  };

  if (loading || checkingSession) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Loading top ten lists...</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Top Tens
        </Typography>
        <Typography variant="h6" component="p" sx={{ mb: 2 }}>
          The books that made our lists
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {members.map((member) => (
          <Box key={member.email} sx={{ flex: 1 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h5" component="h2" sx={{ textAlign: 'center', flex: 1 }}>
                    {member.name}&apos;s Top 10
                  </Typography>
                  {authedEmail === member.email && (
                    <IconButton
                      onClick={() => setDialogOpen(true)}
                      size="small"
                      sx={{ ml: 1 }}
                      disabled={(topTenBooks[member.email]?.length || 0) >= 10}
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />

                {topTenBooks[member.email]?.length > 0 ? (
                  <List>
                    {topTenBooks[member.email].map((book, index) => (
                      <ListItem key={book.id} sx={{ px: 0, alignItems: 'flex-start' }}>
                        {book.cover_url && (
                          <Avatar
                            src={book.cover_url}
                            variant="rounded"
                            sx={{ width: 40, height: 60, mr: 1.5, mt: 0.5, flexShrink: 0 }}
                          />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body1" component="span">
                                <Box component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                                  {index + 1}.
                                </Box>
                                {book.title || "Untitled"}
                              </Typography>
                            }
                            secondary={book.author ? `by ${book.author}` : null}
                          />
                          {book.rating && (
                            <StarRating value={book.rating} readOnly size="small" />
                          )}
                          {book.comment && (
                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                              {book.comment}
                            </Typography>
                          )}
                        </Box>
                        {authedEmail === member.email && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(book)}
                            sx={{ ml: 1, color: 'error.main' }}
                            aria-label="Delete book"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ textAlign: 'center', fontStyle: 'italic', color: 'text.secondary' }}>
                    No books in top ten yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add to Your Top Ten</DialogTitle>
        <DialogContent>
          {/* Book Search Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Search for a book or enter details manually
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                placeholder="Search by title or author..."
                fullWidth
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={searchLoading || searchQuery.trim().length < 3}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                {searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              </Button>
            </Box>

            {/* Search Results */}
            {showResults && (
              <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {searchLoading ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : searchResults.length > 0 ? (
                  <List dense disablePadding>
                    {searchResults.map((book, index) => (
                      <ListItemButton
                        key={`${book.title}-${book.author}-${index}`}
                        onClick={() => handleSelectBook(book)}
                      >
                        {book.coverUrl && (
                          <Avatar
                            src={book.coverUrl}
                            variant="rounded"
                            sx={{ width: 32, height: 48, mr: 1.5 }}
                          />
                        )}
                        <ListItemText
                          primary={book.title}
                          secondary={book.author || 'Unknown author'}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                    No results found. Enter details manually below.
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Selected Book Preview */}
          {formCoverUrl && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Avatar
                src={formCoverUrl}
                variant="rounded"
                sx={{ width: 48, height: 72, mr: 2 }}
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{formTitle}</Typography>
                <Typography variant="caption" color="text.secondary">{formAuthor}</Typography>
              </Box>
            </Box>
          )}

          <TextField
            margin="dense"
            label="Book Title"
            fullWidth
            variant="outlined"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Author (optional)"
            fullWidth
            variant="outlined"
            value={formAuthor}
            onChange={(e) => setFormAuthor(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Why did you choose this book?"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
            helperText="Share your thoughts about why this book made your top ten"
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Your Rating *
            </Typography>
            <StarRating value={formRating} onChange={setFormRating} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAddBook} variant="contained" disabled={saving}>
            {saving ? "Saving..." : "Add to Top Ten"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Book?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{bookToDelete?.title}</strong> from your top ten list?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
