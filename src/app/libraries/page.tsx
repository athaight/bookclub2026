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
import { useProfiles } from "@/lib/useProfiles";
import { BookRow } from "@/types";
import { searchBooks, BookSearchResult } from "@/lib/bookSearch";
import StarRating from "@/components/StarRating";
import MemberAvatar from "@/components/MemberAvatar";

type Member = { email: string; name: string };

const normEmail = (s: string) => s.trim().toLowerCase();

function LibraryBookCard({
  row,
  isOwner,
  onDelete,
  onEdit,
}: {
  row: BookRow;
  isOwner?: boolean;
  onDelete?: (row: BookRow) => void;
  onEdit?: (row: BookRow) => void;
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
              {(row.title ?? "").trim() || "—"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {(row.author ?? "").trim() || "—"}
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

          {isOwner && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {onEdit && (
                <IconButton
                  aria-label="edit"
                  onClick={() => onEdit(row)}
                  size="small"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              {onDelete && (
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
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function OurLibrariesPage() {
  const members = useMemo<Member[]>(
    () => getMembers().map((m) => ({ ...m, email: normEmail(m.email) })),
    []
  );

  const memberEmails = useMemo(() => members.map((m) => m.email), [members]);
  const { profiles } = useProfiles(memberEmails);

  const isMobile = useMediaQuery("(max-width:899px)");

  const [checkingSession, setCheckingSession] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [libraryBooks, setLibraryBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookRow | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formCoverUrl, setFormCoverUrl] = useState<string | null>(null);
  const [formRating, setFormRating] = useState<number | null>(null);
  const [formComment, setFormComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<BookRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const m of members) init[m.email] = true;
    setExpanded(init);
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
          await supabase.auth.signOut({ scope: 'local' });
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
          supabase.auth.signOut({ scope: 'local' });
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

  async function refresh() {
    setErr(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("in_library", true)
      .in("member_email", members.map((m) => m.email))
      .order("title", { ascending: true });

    if (error) {
      setErr(error.message);
      setLibraryBooks([]);
      setLoading(false);
      return;
    }

    const normalized = ((data ?? []) as BookRow[]).map((r) => ({
      ...r,
      member_email: normEmail(r.member_email),
    }));

    setLibraryBooks(normalized);
    setLoading(false);
  }

  useEffect(() => {
    if (!checkingSession) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingSession]);

  // Search handlers
  async function handleSearch() {
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
  }

  function handleSelectBook(book: BookSearchResult) {
    setFormTitle(book.title);
    setFormAuthor(book.author);
    setFormCoverUrl(book.coverUrl || null);
    setSearchResults([]);
    setShowResults(false);
    setSearchQuery("");
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingBook(null);
    setFormTitle("");
    setFormAuthor("");
    setFormCoverUrl(null);
    setFormRating(null);
    setFormComment("");
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }

  function handleEditClick(book: BookRow) {
    setEditingBook(book);
    setFormTitle(book.title || "");
    setFormAuthor(book.author || "");
    setFormCoverUrl(book.cover_url || null);
    setFormRating(book.rating || null);
    setFormComment(book.comment || "");
    setDialogOpen(true);
  }

  async function handleSaveBook() {
    if (!authedEmail) return;

    const title = formTitle.trim();
    const author = formAuthor.trim();
    const comment = formComment.trim();

    if (!title) {
      alert("Title is required.");
      return;
    }

    setSaving(true);

    try {
      if (editingBook) {
        // Update existing book
        const { error } = await supabase
          .from("books")
          .update({
            title,
            author: author || "",
            cover_url: formCoverUrl || null,
            rating: formRating,
            comment: comment || "",
          })
          .eq("id", editingBook.id);

        if (error) throw new Error(error.message);
      } else {
        // Check for duplicates when adding
        const existingBook = libraryBooks.find(
          (b) =>
            b.member_email === authedEmail &&
            b.title.toLowerCase() === title.toLowerCase() &&
            (b.author || "").toLowerCase() === author.toLowerCase()
        );

        if (existingBook) {
          alert("This book is already in your library.");
          setSaving(false);
          return;
        }

        // Insert new book
        const { error } = await supabase.from("books").insert({
          member_email: authedEmail,
          status: "completed",
          title,
          author: author || "",
          cover_url: formCoverUrl || null,
          in_library: true,
          rating: formRating,
          comment: comment || "",
        });

        if (error) throw new Error(error.message);
      }

      handleDialogClose();
      await refresh();
    } catch (e) {
      alert(`Error saving book: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick(book: BookRow) {
    setBookToDelete(book);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!bookToDelete) return;

    setDeleting(true);

    try {
      // Instead of deleting, just remove from library
      const { error } = await supabase
        .from("books")
        .update({ in_library: false })
        .eq("id", bookToDelete.id);

      if (error) throw new Error(error.message);

      setDeleteDialogOpen(false);
      setBookToDelete(null);
      await refresh();
    } catch (e) {
      alert(`Error removing book: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteCancel() {
    setDeleteDialogOpen(false);
    setBookToDelete(null);
  }

  // Get books by member
  const booksByMember: Record<string, BookRow[]> = {};
  for (const m of members) {
    booksByMember[m.email] = libraryBooks.filter((b) => b.member_email === m.email);
  }

  if (loading || checkingSession) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading libraries...
        </Typography>
      </Box>
    );
  }

  function renderLibraryColumn(m: Member) {
    const books = booksByMember[m.email] || [];
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <MemberAvatar name={m.name} email={m.email} profiles={profiles} size="medium" />
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
              {m.name}&apos;s Library
            </Typography>
          </Box>
          {isOwner && (
            <IconButton
              onClick={() => setDialogOpen(true)}
              color="primary"
              aria-label="Add book to library"
            >
              <AddIcon />
            </IconButton>
          )}
        </Box>

        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          {books.length} {books.length === 1 ? "book" : "books"}
        </Typography>

        {books.length > 0 ? (
          books.map((book) => (
            <LibraryBookCard
              key={book.id}
              row={book}
              isOwner={isOwner}
              onDelete={handleDeleteClick}
              onEdit={handleEditClick}
            />
          ))
        ) : (
          <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
            No books in library yet
          </Typography>
        )}
      </Box>
    );
  }

  function renderMobileDetails(m: Member) {
    const books = booksByMember[m.email] || [];
    const isOwner = authedEmail === m.email;

    return (
      <>
        {isOwner && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              fullWidth
            >
              Add book to library
            </Button>
          </Box>
        )}

        {books.length > 0 ? (
          books.map((book) => (
            <LibraryBookCard
              key={book.id}
              row={book}
              isOwner={isOwner}
              onDelete={handleDeleteClick}
              onEdit={handleEditClick}
            />
          ))
        ) : (
          <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
            No books in library yet
          </Typography>
        )}
      </>
    );
  }

  return (
    <>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Libraries
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 700, mx: "auto", color: "text.secondary" }}>
          A collection of all the books we&apos;ve ever read.
          {authedEmail && (
            <> Books are automatically added when you complete a book or add one to your Top Ten.</>
          )}
        </Typography>
      </Box>

      {err && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{err}</Typography>
        </Box>
      )}

      {isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {members.map((m) => {
            const books = booksByMember[m.email] || [];
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                    <MemberAvatar name={m.name} email={m.email} profiles={profiles} size="medium" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="h2">
                        {m.name}&apos;s Library
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.75 }}>
                        {books.length} {books.length === 1 ? "book" : "books"}
                      </Typography>
                    </Box>
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
            <Box key={m.email}>{renderLibraryColumn(m)}</Box>
          ))}
        </Box>
      )}

      {/* Add/Edit Book Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBook ? "Edit Book" : "Add to Your Library"}</DialogTitle>
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
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={searchLoading || searchQuery.trim().length < 3}
                sx={{ minWidth: "auto", px: 2 }}
              >
                {searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              </Button>
            </Box>

            {/* Search Results */}
            {showResults && (
              <Box
                sx={{
                  mt: 1,
                  maxHeight: 200,
                  overflow: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                {searchLoading ? (
                  <Box sx={{ p: 2, textAlign: "center" }}>
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
                          secondary={book.author || "Unknown author"}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ p: 2, textAlign: "center", color: "text.secondary" }}
                  >
                    No results found. Enter details manually below.
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Selected Book Preview */}
          {formCoverUrl && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                p: 1,
                bgcolor: "action.hover",
                borderRadius: 1,
              }}
            >
              <Avatar
                src={formCoverUrl}
                variant="rounded"
                sx={{ width: 48, height: 72, mr: 2 }}
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                  {formTitle}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formAuthor}
                </Typography>
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
            label="Notes / Comments (optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
            helperText="Share your thoughts about this book"
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Rating (optional):
            </Typography>
            <StarRating value={formRating} onChange={setFormRating} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveBook} variant="contained" disabled={saving}>
            {saving ? "Saving..." : editingBook ? "Save Changes" : "Add to Library"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
        <DialogTitle>Remove from Library?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{bookToDelete?.title}</strong> from your
            library?
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