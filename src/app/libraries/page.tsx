"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
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
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { useProfiles } from "@/lib/useProfiles";
import { BookRow } from "@/types";
import { searchBooks, BookSearchResult } from "@/lib/bookSearch";
import StarRating from "@/components/StarRating";
import MemberAvatar from "@/components/MemberAvatar";
import BookCoverImage from "@/components/BookCoverImage";
import BookChatModal from "@/components/BookChatModal";
import { motion } from "framer-motion";

type Member = { email: string; name: string };

const normEmail = (s: string) => s.trim().toLowerCase();

function LibraryBookCard({
  row,
  isOwner,
  onDelete,
  onEdit,
  onAdd,
  onChat,
  canAdd,
}: {
  row: BookRow;
  isOwner?: boolean;
  onDelete?: (row: BookRow) => void;
  onEdit?: (row: BookRow) => void;
  onAdd?: (row: BookRow) => void;
  onChat?: (row: BookRow) => void;
  canAdd?: boolean;
}) {
  return (
    <Card sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <BookCoverImage
            coverUrl={row.cover_url}
            title={row.title || "Book"}
            variant="default"
          />
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
            {/* Chat icon */}
            {onChat && (
              <IconButton
                aria-label="chat about this book"
                onClick={() => onChat(row)}
                size="small"
                color="primary"
                title="Chat about this book"
                sx={{ mt: 0.5, ml: -0.5 }}
              >
                <ChatBubbleOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {isOwner ? (
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
          ) : (
            canAdd && onAdd && (
              <IconButton
                aria-label="add to my list"
                onClick={() => onAdd(row)}
                size="small"
                color="primary"
                title="Add to my list"
              >
                <BookmarkBorderIcon fontSize="small" />
              </IconButton>
            )
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
  const [topTenBooks, setTopTenBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookRow | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formCoverUrl, setFormCoverUrl] = useState<string | null>(null);
  const [formGenre, setFormGenre] = useState<string | null>(null);
  const [formRating, setFormRating] = useState<number | null>(null);
  const [formComment, setFormComment] = useState("");
  const [formTopTen, setFormTopTen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

  // Top Ten conflict dialogs
  const [topTenFullDialogOpen, setTopTenFullDialogOpen] = useState(false);
  const [alreadyTopTenDialogOpen, setAlreadyTopTenDialogOpen] = useState(false);

  // Search state
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<BookRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add to list state (for adding books from other users' libraries)
  const [myAllBooks, setMyAllBooks] = useState<BookRow[]>([]);
  const [addToListDialogOpen, setAddToListDialogOpen] = useState(false);
  const [bookToAdd, setBookToAdd] = useState<BookRow | null>(null);
  const [addingBook, setAddingBook] = useState(false);

  // Book chat modal state
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatBook, setChatBook] = useState<BookRow | null>(null);

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

    // Fetch library books and top ten books in parallel
    const [libraryResult, topTenResult] = await Promise.all([
      supabase
        .from("books")
        .select("*")
        .eq("in_library", true)
        .in("member_email", members.map((m) => m.email))
        .order("title", { ascending: true }),
      supabase
        .from("books")
        .select("*")
        .eq("top_ten", true)
        .in("member_email", members.map((m) => m.email))
    ]);

    if (libraryResult.error) {
      setErr(libraryResult.error.message);
      setLibraryBooks([]);
      setTopTenBooks([]);
      setLoading(false);
      return;
    }

    const normalizedLibrary = ((libraryResult.data ?? []) as BookRow[]).map((r) => ({
      ...r,
      member_email: normEmail(r.member_email),
    }));

    // Deduplicate library books by member + title + author (keep most recently created or one with rating)
    const dedupedLibrary = normalizedLibrary.reduce<BookRow[]>((acc, book) => {
      const existingIdx = acc.findIndex(b => 
        b.member_email === book.member_email &&
        (b.title ?? '').toLowerCase().trim() === (book.title ?? '').toLowerCase().trim() &&
        (b.author ?? '').toLowerCase().trim() === (book.author ?? '').toLowerCase().trim()
      );
      if (existingIdx >= 0) {
        // Keep the one with the most recent created_at, or the one with a rating/comment
        const existing = acc[existingIdx];
        const existingDate = existing.created_at ? new Date(existing.created_at).getTime() : 0;
        const bookDate = book.created_at ? new Date(book.created_at).getTime() : 0;
        const bookHasMoreData = (book.rating || book.comment) && !(existing.rating || existing.comment);
        if (bookDate > existingDate || bookHasMoreData) {
          acc[existingIdx] = book;
        }
      } else {
        acc.push(book);
      }
      return acc;
    }, []);

    const normalizedTopTen = ((topTenResult.data ?? []) as BookRow[]).map((r) => ({
      ...r,
      member_email: normEmail(r.member_email),
    }));

    setLibraryBooks(dedupedLibrary);
    setTopTenBooks(normalizedTopTen);
    setLoading(false);
  }

  useEffect(() => {
    if (!checkingSession) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingSession]);

  // Fetch all books for the current user (to check for duplicates)
  useEffect(() => {
    async function fetchMyBooks() {
      if (!authedEmail) {
        setMyAllBooks([]);
        return;
      }
      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("member_email", authedEmail);
      setMyAllBooks((data ?? []) as BookRow[]);
    }
    fetchMyBooks();
  }, [authedEmail]);

  // Check if user already has this book
  function userHasBook(title: string, author: string): boolean {
    const normTitle = title.toLowerCase().trim();
    const normAuthor = (author || "").toLowerCase().trim();
    return myAllBooks.some(
      (b) =>
        (b.title || "").toLowerCase().trim() === normTitle &&
        (b.author || "").toLowerCase().trim() === normAuthor
    );
  }

  // Handle clicking add button on another user's book
  function handleAddToListClick(book: BookRow) {
    setBookToAdd(book);
    setAddToListDialogOpen(true);
  }

  // Handle clicking chat button on a book
  function handleChatClick(book: BookRow) {
    setChatBook(book);
    setChatModalOpen(true);
  }

  // Add book to library or wishlist
  async function handleConfirmAddToList(destination: "library" | "wishlist") {
    if (!authedEmail || !bookToAdd) return;

    setAddingBook(true);

    try {
      const { error } = await supabase.from("books").insert({
        member_email: authedEmail,
        title: bookToAdd.title,
        author: bookToAdd.author || "",
        cover_url: bookToAdd.cover_url || null,
        genre: bookToAdd.genre || null,
        status: destination === "library" ? "completed" : "wishlist",
        in_library: destination === "library",
        top_ten: false,
        rating: null,
        comment: "",
        reading_challenge_year: null, // Don't add to reading challenge
      });

      if (error) throw new Error(error.message);

      // Refresh data
      await refresh();
      // Refresh user's books for duplicate checking
      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("member_email", authedEmail);
      setMyAllBooks((data ?? []) as BookRow[]);

      setAddToListDialogOpen(false);
      setBookToAdd(null);
    } catch (e) {
      alert(`Error adding book: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setAddingBook(false);
    }
  }

  // Search handlers
  async function handleSearch() {
    const query = searchInputRef.current?.value.trim() || "";
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    setShowResults(true);
    setLastQuery(query);

    try {
      const { books, hasMore } = await searchBooks(query, { limit: 30 });
      setSearchResults(books);
      setHasMoreResults(hasMore);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleLoadMore() {
    if (lastQuery.length < 3) return;
    setLoadingMore(true);
    try {
      const { books: moreResults, hasMore } = await searchBooks(lastQuery, { limit: 30, offset: searchResults.length });
      if (moreResults.length > 0) {
        const existingKeys = new Set(searchResults.map(b => `${b.title.toLowerCase()}|${(b.author || '').toLowerCase()}`));
        const newResults = moreResults.filter(b => !existingKeys.has(`${b.title.toLowerCase()}|${(b.author || '').toLowerCase()}`));
        setSearchResults([...searchResults, ...newResults]);
        setHasMoreResults(hasMore);
      } else {
        setHasMoreResults(false);
      }
    } catch (error) {
      console.error("Load more error:", error);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleSelectBook(book: BookSearchResult) {
    setFormTitle(book.title);
    setFormAuthor(book.author);
    setFormCoverUrl(book.coverUrl || null);
    setFormGenre(book.genre || null);
    setPendingCoverFile(null);
    setSearchResults([]);
    setShowResults(false);
    if (searchInputRef.current) searchInputRef.current.value = "";
  }

  // Handle cover file selection in the dialog
  function handleCoverFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    setPendingCoverFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFormCoverUrl(previewUrl);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingBook(null);
    setFormTitle("");
    setFormAuthor("");
    setFormCoverUrl(null);
    setFormGenre(null);
    setFormRating(null);
    setFormComment("");
    setFormTopTen(false);
    setPendingCoverFile(null);
    if (searchInputRef.current) searchInputRef.current.value = "";
    setSearchResults([]);
    setShowResults(false);
  }

  function handleEditClick(book: BookRow) {
    setEditingBook(book);
    setFormTitle(book.title || "");
    setFormAuthor(book.author || "");
    setFormCoverUrl(book.cover_url || null);
    setFormRating(book.rating || null);
    setFormTopTen(book.top_ten || false);
    setFormComment(book.comment || "");
    setPendingCoverFile(null);
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

    // If adding to Top Ten, validate
    if (formTopTen && authedEmail) {
      const userTopTen = topTenBooks.filter((b) => b.member_email === authedEmail);
      
      // Check if top ten is full (only for new books or books not already in top ten)
      if (userTopTen.length >= 10 && (!editingBook || !editingBook.top_ten)) {
        setTopTenFullDialogOpen(true);
        return;
      }

      // Check if book already exists in top ten (for new books only)
      if (!editingBook) {
        const alreadyInTopTen = userTopTen.find(
          (b) =>
            b.title.toLowerCase() === title.toLowerCase() &&
            (b.author || "").toLowerCase() === author.toLowerCase()
        );
        if (alreadyInTopTen) {
          setAlreadyTopTenDialogOpen(true);
          return;
        }
      }

      // Rating is required for top ten
      if (!formRating) {
        alert("Rating is required for Top Ten books.");
        return;
      }
    }

    setSaving(true);

    try {
      // Handle cover upload if a new file was selected
      let finalCoverUrl = formCoverUrl;
      let coverWasUploaded = false;
      if (pendingCoverFile) {
        const fileExt = pendingCoverFile.name.split(".").pop();
        const fileName = `cover_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("book-covers")
          .upload(fileName, pendingCoverFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Cover upload failed: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from("book-covers").getPublicUrl(fileName);
        finalCoverUrl = urlData.publicUrl;
        coverWasUploaded = true;
      }

      if (editingBook) {
        // Update existing book
        const { error } = await supabase
          .from("books")
          .update({
            title,
            author: author || "",
            cover_url: finalCoverUrl || null,
            rating: formRating,
            comment: comment || "",
            top_ten: formTopTen,
          })
          .eq("id", editingBook.id);

        if (error) throw new Error(error.message);

        // If a cover was uploaded, propagate it to all matching books across all users
        if (coverWasUploaded && finalCoverUrl) {
          await supabase
            .from("books")
            .update({ cover_url: finalCoverUrl })
            .ilike("title", title)
            .ilike("author", author || "");
        }
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
          cover_url: finalCoverUrl || null,
          genre: formGenre || null,
          in_library: true,
          top_ten: formTopTen,
          rating: formRating,
          comment: comment || "",
        });

        if (error) throw new Error(error.message);

        // If a cover was uploaded, propagate it to all matching books across all users
        if (coverWasUploaded && finalCoverUrl) {
          await supabase
            .from("books")
            .update({ cover_url: finalCoverUrl })
            .ilike("title", title)
            .ilike("author", author || "");
        }
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
            <MemberAvatar name={m.name} email={m.email} profiles={profiles} size="medium" linkToProfile />
            <Typography
              component={Link}
              href="/profiles"
              variant="h5"
              sx={{
                fontWeight: 600,
                textDecoration: "none",
                color: "inherit",
                "&:hover": { color: "primary.main" },
              }}
            >
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
              onAdd={handleAddToListClick}
              onChat={handleChatClick}
              canAdd={!!authedEmail && !isOwner && !userHasBook(book.title || "", book.author || "")}
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
              onAdd={handleAddToListClick}
              onChat={handleChatClick}
              canAdd={!!authedEmail && !isOwner && !userHasBook(book.title || "", book.author || "")}
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
      <Box sx={{ textAlign: "center", mb: 4, overflow: "hidden" }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            Libraries
          </Typography>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <Typography variant="body1" sx={{ maxWidth: 700, mx: "auto", color: "text.secondary" }}>
            A collection of all the books we&apos;ve ever read.
          </Typography>
        </motion.div>
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
                    <MemberAvatar name={m.name} email={m.email} profiles={profiles} size="medium" linkToProfile />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        component={Link}
                        href="/profiles"
                        variant="h6"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        sx={{
                          textDecoration: "none",
                          color: "inherit",
                          "&:hover": { color: "primary.main" },
                        }}
                      >
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
                inputRef={searchInputRef}
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
                disabled={searchLoading}
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
                  maxHeight: 350,
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
                  <>
                    <List dense disablePadding>
                      {searchResults.map((book, index) => (
                        <ListItemButton
                          key={`${book.title}-${book.author}-${index}`}
                          onClick={() => handleSelectBook(book)}
                        >
                          <BookCoverImage
                            coverUrl={book.coverUrl}
                            title={book.title}
                            variant="small"
                          />
                          <Box sx={{ ml: 1.5 }}>
                            <ListItemText
                              primary={book.title}
                              secondary={book.author || "Unknown author"}
                              primaryTypographyProps={{ noWrap: true }}
                              secondaryTypographyProps={{ noWrap: true }}
                            />
                          </Box>
                        </ListItemButton>
                      ))}
                    </List>
                    {hasMoreResults && (
                      <Box sx={{ p: 1, textAlign: "center", borderTop: "1px solid", borderColor: "divider" }}>
                        <Button
                          size="small"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          startIcon={loadingMore ? <CircularProgress size={14} /> : null}
                        >
                          {loadingMore ? "Loading..." : "Load more results"}
                        </Button>
                      </Box>
                    )}
                  </>
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

          {/* Selected Book Preview with Cover Upload */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              mb: 2,
              p: 1,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          >
            <BookCoverImage
              coverUrl={formCoverUrl}
              title={formTitle || "Book"}
              variant="large"
            />
            <Box sx={{ ml: 2, flex: 1 }}>
              {formTitle && (
                <>
                  <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                    {formTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formAuthor}
                  </Typography>
                </>
              )}
              {/* Cover Upload Button */}
              <Box sx={{ mt: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileSelect}
                  style={{ display: "none" }}
                  id="library-cover-upload"
                />
                <label htmlFor="library-cover-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    size="small"
                    startIcon={<AddPhotoAlternateIcon />}
                  >
                    {formCoverUrl ? "Change Cover" : "Add Cover"}
                  </Button>
                </label>
                {pendingCoverFile && (
                  <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                    New image selected
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Rating{formTopTen ? " (required for Top Ten)" : " (optional)"}:
            </Typography>
            <StarRating value={formRating} onChange={setFormRating} />
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={formTopTen}
                onChange={(e) => setFormTopTen(e.target.checked)}
              />
            }
            label="Add to my Top Ten"
          />
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

      {/* Top Ten Full Dialog */}
      <Dialog open={topTenFullDialogOpen} onClose={() => setTopTenFullDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Top Ten is Full</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You already have 10 books in your Top Ten list. Please remove a book from your Top Ten first before adding another.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopTenFullDialogOpen(false)} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Already in Top Ten Dialog */}
      <Dialog open={alreadyTopTenDialogOpen} onClose={() => setAlreadyTopTenDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Already in Top Ten</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This book is already in your Top Ten list.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlreadyTopTenDialogOpen(false)} variant="contained">
            OK
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

      {/* Add to List Confirmation Dialog */}
      <Dialog
        open={addToListDialogOpen}
        onClose={() => {
          if (!addingBook) {
            setAddToListDialogOpen(false);
            setBookToAdd(null);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add to Your List</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Where would you like to add <strong>{bookToAdd?.title}</strong>?
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => handleConfirmAddToList("library")}
              disabled={addingBook}
              fullWidth
            >
              {addingBook ? "Adding..." : "Add to My Library"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleConfirmAddToList("wishlist")}
              disabled={addingBook}
              fullWidth
            >
              {addingBook ? "Adding..." : "Add to My Wishlist"}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddToListDialogOpen(false);
              setBookToAdd(null);
            }}
            disabled={addingBook}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Book Chat Modal */}
      <BookChatModal
        open={chatModalOpen}
        onClose={() => {
          setChatModalOpen(false);
          setChatBook(null);
        }}
        book={chatBook ? {
          title: chatBook.title || "",
          author: chatBook.author,
          coverUrl: chatBook.cover_url,
        } : null}
        currentUserEmail={authedEmail}
        profiles={profiles}
        members={members}
        readOnly={!authedEmail}
      />
    </>
  );
}