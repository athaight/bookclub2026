"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { BookRow } from "@/types";
import { searchBooks, BookSearchResult } from "@/lib/bookSearch";
import StarRating from "@/components/StarRating";

type Member = { email: string; name: string };

const normEmail = (s: string) => s.trim().toLowerCase();

function TopTenBookCard({
  row,
  index,
  isOwner,
  onDelete,
}: {
  row: BookRow;
  index: number;
  isOwner?: boolean;
  onDelete?: (row: BookRow) => void;
}) {
  return (
    <Card sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          {row.cover_url && (
            <Avatar
              src={row.cover_url}
              variant="rounded"
              sx={{ width: 40, height: 60, flexShrink: 0, mt: 0.5 }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" component="h3" sx={{ fontWeight: 500 }}>
              <Box component="span" sx={{ fontWeight: "bold", mr: 1 }}>
                {index + 1}.
              </Box>
              {(row.title ?? "").trim() || "—"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {row.author ? `by ${row.author}` : "—"}
            </Typography>
            {row.rating && (
              <StarRating value={row.rating} readOnly size="small" />
            )}
            {row.comment && (
              <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic", color: "text.secondary" }}>
                {row.comment}
              </Typography>
            )}
          </Box>

          {isOwner && onDelete && (
            <IconButton
              aria-label="delete"
              onClick={() => onDelete(row)}
              size="small"
              sx={{ color: "error.main" }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TopTensPage() {
  const members = useMemo<Member[]>(
    () => getMembers().map((m) => ({ ...m, email: normEmail(m.email) })),
    []
  );

  const isMobile = useMediaQuery("(max-width:899px)");

  const [topTenBooks, setTopTenBooks] = useState<Record<string, BookRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    const init: Record<string, boolean> = {};
    for (const m of members) init[m.email] = true;
    setExpanded(init);
  }, [members]);

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
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading top ten lists...
        </Typography>
      </Box>
    );
  }

  function renderTopTenColumn(m: Member) {
    const books = topTenBooks[m.email] || [];
    const isOwner = authedEmail === m.email;

    return (
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            position: "sticky",
            top: 64,
            zIndex: 10,
            backgroundColor: "background.default",
            py: 1,
            mx: -1,
            px: 1,
          }}
        >
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            {m.name}&apos;s Top 10
          </Typography>
          {isOwner && (
            <IconButton
              onClick={() => setDialogOpen(true)}
              color="primary"
              aria-label="Add book to top ten"
              disabled={books.length >= 10}
            >
              <AddIcon />
            </IconButton>
          )}
        </Box>

        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          {books.length} / 10 books
        </Typography>

        {books.length > 0 ? (
          books.map((book, index) => (
            <TopTenBookCard
              key={book.id}
              row={book}
              index={index}
              isOwner={isOwner}
              onDelete={handleDeleteClick}
            />
          ))
        ) : (
          <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
            No books in top ten yet
          </Typography>
        )}
      </Box>
    );
  }

  function renderMobileDetails(m: Member) {
    const books = topTenBooks[m.email] || [];
    const isOwner = authedEmail === m.email;

    return (
      <>
        {isOwner && books.length < 10 && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              fullWidth
            >
              Add book to top ten
            </Button>
          </Box>
        )}

        {books.length > 0 ? (
          books.map((book, index) => (
            <TopTenBookCard
              key={book.id}
              row={book}
              index={index}
              isOwner={isOwner}
              onDelete={handleDeleteClick}
            />
          ))
        ) : (
          <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
            No books in top ten yet
          </Typography>
        )}
      </>
    );
  }

  return (
    <>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Top Tens
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 700, mx: "auto", color: "text.secondary" }}>
          The books that made our lists
        </Typography>
      </Box>

      {isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {members.map((m) => {
            const books = topTenBooks[m.email] || [];
            const isExpanded = !!expanded[m.email];

            return (
              <Accordion
                key={m.email}
                expanded={isExpanded}
                onChange={() =>
                  setExpanded((prev) => ({ ...prev, [m.email]: !prev[m.email] }))
                }
                disableGutters
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    position: isExpanded ? "static" : "sticky",
                    top: 0,
                    zIndex: isExpanded ? "auto" : 10,
                    backgroundColor: "background.paper",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="h6" component="h2">
                      {m.name}&apos;s Top 10
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      {books.length} / 10 books
                    </Typography>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>{renderMobileDetails(m)}</AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 3,
          }}
        >
          {members.map((m) => (
            <Box key={m.email}>{renderTopTenColumn(m)}</Box>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add to Your Top Ten</DialogTitle>
        <DialogContent>
          {/* Book Search Section */}
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
              Search for a book or enter details manually
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
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
