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
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SearchIcon from "@mui/icons-material/Search";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import EditIcon from "@mui/icons-material/Edit";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { useProfiles } from "@/lib/useProfiles";
import { BookRow } from "@/types";
import { searchBooks, BookSearchResult } from "@/lib/bookSearch";
import StarRating from "@/components/StarRating";
import MemberAvatar from "@/components/MemberAvatar";
import BookCoverImage from "@/components/BookCoverImage";

type Member = { email: string; name: string };

const normEmail = (s: string) => s.trim().toLowerCase();

function TopTenBookCard({
  row,
  index,
  isOwner,
  onDelete,
  onEdit,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isDragOver,
}: {
  row: BookRow;
  index: number;
  isOwner?: boolean;
  onDelete?: (row: BookRow) => void;
  onEdit?: (row: BookRow) => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDrop?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}) {
  return (
    <Card
      sx={{
        mb: 1,
        opacity: isDragging ? 0.5 : 1,
        border: isDragOver ? "2px dashed #667eea" : "none",
        transition: "all 0.2s ease",
      }}
      draggable={isOwner}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
    >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        {/* Drag Handle - top center on mobile, only show for owner */}
        {isOwner && (
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              justifyContent: "center",
              cursor: "grab",
              color: "text.secondary",
              "&:active": { cursor: "grabbing" },
              mb: 0.5,
            }}
          >
            <DragIndicatorIcon fontSize="small" sx={{ transform: "rotate(90deg)" }} />
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          {/* Drag Handle - left side on desktop, only show for owner */}
          {isOwner && (
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                cursor: "grab",
                color: "text.secondary",
                "&:active": { cursor: "grabbing" },
                mt: 1,
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          )}

          <BookCoverImage
            coverUrl={row.cover_url}
            title={row.title || "Book"}
            variant="default"
          />
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

export default function TopTensPage() {
  const members = useMemo<Member[]>(
    () => getMembers().map((m) => ({ ...m, email: normEmail(m.email) })),
    []
  );

  const memberEmails = useMemo(() => members.map((m) => m.email), [members]);
  const { profiles } = useProfiles(memberEmails);

  const isMobile = useMediaQuery("(max-width:899px)");

  const [topTenBooks, setTopTenBooks] = useState<Record<string, BookRow[]>>({});
  const [libraryBooks, setLibraryBooks] = useState<BookRow[]>([]);
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
  const [formGenre, setFormGenre] = useState<string | null>(null);
  const [formRating, setFormRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

  // Book search state
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<BookRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Duplicate detection dialog state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateLibraryBook, setDuplicateLibraryBook] = useState<BookRow | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number | null>(null);
  const [pendingEditCoverFile, setPendingEditCoverFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const m of members) init[m.email] = true;
    setExpanded(init);
  }, [members]);

  useEffect(() => {
    async function fetchBooks() {
      // Fetch top ten and library books in parallel
      const [topTenResult, libraryResult] = await Promise.all([
        supabase
          .from("books")
          .select("*")
          .eq("top_ten", true)
          .in("member_email", members.map((m) => m.email))
          .order("top_ten_rank", { ascending: true, nullsFirst: false }),
        supabase
          .from("books")
          .select("*")
          .eq("in_library", true)
          .in("member_email", members.map((m) => m.email))
      ]);

      if (topTenResult.error) {
        console.error("Error fetching top ten books:", topTenResult.error);
        setLoading(false);
        return;
      }

      // Group top ten books by member email and take only the first 10 for each
      const grouped: Record<string, BookRow[]> = {};
      members.forEach((member) => {
        grouped[member.email] = topTenResult.data
          ?.filter((book) => book.member_email === member.email)
          .slice(0, 10) || [];
      });

      setTopTenBooks(grouped);
      
      // Store library books (normalized)
      const normalizedLibrary = ((libraryResult.data ?? []) as BookRow[]).map((r) => ({
        ...r,
        member_email: normEmail(r.member_email),
      }));
      setLibraryBooks(normalizedLibrary);
      
      setLoading(false);
    }

    fetchBooks();
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
  };

  const handleLoadMore = async () => {
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
  };

  // Select a book from search results
  const handleSelectBook = (book: BookSearchResult) => {
    setFormTitle(book.title);
    setFormAuthor(book.author);
    setFormCoverUrl(book.coverUrl || null);
    setFormGenre(book.genre || null);
    setPendingCoverFile(null);
    setSearchResults([]);
    setShowResults(false);
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  // Handle cover file selection in the dialog
  const handleCoverFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    setPendingCoverFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFormCoverUrl(previewUrl);
  };

  // Reset dialog state when opening/closing
  const handleDialogClose = () => {
    setDialogOpen(false);
    if (searchInputRef.current) searchInputRef.current.value = "";
    setSearchResults([]);
    setShowResults(false);
    setFormTitle("");
    setFormAuthor("");
    setFormComment("");
    setFormCoverUrl(null);
    setFormGenre(null);
    setFormRating(null);
    setPendingCoverFile(null);
  };

  // Edit dialog handlers
  const openEditDialog = (book: BookRow) => {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author || "");
    setEditComment(book.comment || "");
    setEditCoverUrl(book.cover_url || null);
    setEditRating(book.rating || null);
    setPendingEditCoverFile(null);
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingBook(null);
    setEditTitle("");
    setEditAuthor("");
    setEditComment("");
    setEditCoverUrl(null);
    setEditRating(null);
    setPendingEditCoverFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editingBook || !authedEmail) return;

    const title = editTitle.trim();
    if (!title) {
      alert("Title is required.");
      return;
    }

    if (!editRating) {
      alert("Rating is required for Top Ten books.");
      return;
    }

    setSavingEdit(true);
    try {
      let finalCoverUrl = editCoverUrl;

      // If a new cover file was selected, upload it
      if (pendingEditCoverFile) {
        const fileExt = pendingEditCoverFile.name.split(".").pop();
        const fileName = `cover_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("book-covers")
          .upload(fileName, pendingEditCoverFile, { upsert: true });

        if (uploadError) throw new Error(`Cover upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from("book-covers").getPublicUrl(fileName);
        finalCoverUrl = urlData.publicUrl;
      }

      // Update the book
      const { error } = await supabase
        .from("books")
        .update({
          title,
          author: editAuthor.trim() || null,
          comment: editComment.trim() || null,
          cover_url: finalCoverUrl,
          rating: editRating,
        })
        .eq("id", editingBook.id);

      if (error) throw error;

      await refreshTopTenBooks();
      closeEditDialog();
    } catch (error) {
      console.error("Error saving book:", error);
      alert(`Error saving book: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSavingEdit(false);
    }
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

    // Check if book already exists in user's top ten
    const alreadyInTopTen = userBooks.find(
      (b) =>
        b.title.toLowerCase() === title.toLowerCase() &&
        (b.author || "").toLowerCase() === author.toLowerCase()
    );
    if (alreadyInTopTen) {
      alert("This book is already in your Top Ten.");
      return;
    }

    // Check if book already exists in library
    const existingLibraryBook = libraryBooks.find(
      (b) =>
        b.member_email === authedEmail &&
        b.title.toLowerCase() === title.toLowerCase() &&
        (b.author || "").toLowerCase() === author.toLowerCase()
    );

    if (existingLibraryBook) {
      // Book exists in library - show dialog
      setDuplicateLibraryBook(existingLibraryBook);
      setDuplicateDialogOpen(true);
      return;
    }

    // Book doesn't exist - add new
    await addNewTopTenBook(title, author, comment);
  };

  // Add a new top ten book (and to library)
  const addNewTopTenBook = async (title: string, author: string, comment: string) => {
    setSaving(true);

    // Calculate next rank (add to end of list)
    const userBooks = topTenBooks[authedEmail || ""] || [];
    const nextRank = userBooks.length + 1;

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

      const { error } = await supabase.from("books").insert({
        member_email: authedEmail,
        status: "completed",
        title,
        author: author || "",
        comment: comment || "",
        cover_url: finalCoverUrl || null,
        genre: formGenre || null,
        top_ten: true,
        in_library: true,
        rating: formRating,
        top_ten_rank: nextRank,
      });

      if (error) throw new Error(error.message);

      await refreshTopTenBooks();
      handleDialogClose();
    } catch (e) {
      alert(`Error saving book: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // Replace library book with new top ten entry
  const handleDuplicateReplace = async () => {
    if (!duplicateLibraryBook || !authedEmail) return;

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

      // Delete the old library book
      await supabase.from("books").delete().eq("id", duplicateLibraryBook.id);

      // Calculate next rank (add to end of list)
      const userBooks = topTenBooks[authedEmail || ""] || [];
      const nextRank = userBooks.length + 1;

      // Add new top ten book
      const { error } = await supabase.from("books").insert({
        member_email: authedEmail,
        status: "completed",
        title: formTitle.trim(),
        author: formAuthor.trim() || "",
        comment: formComment.trim() || "",
        cover_url: finalCoverUrl || null,
        genre: formGenre || null,
        top_ten: true,
        in_library: true,
        rating: formRating,
        top_ten_rank: nextRank,
      });

      if (error) throw new Error(error.message);

      await refreshTopTenBooks();
      setDuplicateDialogOpen(false);
      setDuplicateLibraryBook(null);
      handleDialogClose();
    } catch (e) {
      alert(`Error saving book: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // Add from library (update existing record to be top ten)
  const handleDuplicateAddFromLibrary = async () => {
    if (!duplicateLibraryBook) return;

    setSaving(true);

    // Calculate next rank (add to end of list)
    const userBooks = topTenBooks[authedEmail || ""] || [];
    const nextRank = userBooks.length + 1;

    try {
      const { error } = await supabase
        .from("books")
        .update({
          top_ten: true,
          rating: formRating || duplicateLibraryBook.rating,
          top_ten_rank: nextRank,
        })
        .eq("id", duplicateLibraryBook.id);

      if (error) throw new Error(error.message);

      await refreshTopTenBooks();
      setDuplicateDialogOpen(false);
      setDuplicateLibraryBook(null);
      handleDialogClose();
    } catch (e) {
      alert(`Error saving book: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // Cancel duplicate dialog
  const handleDuplicateCancel = () => {
    setDuplicateDialogOpen(false);
    setDuplicateLibraryBook(null);
  };

  // Refresh top ten books after changes
  const refreshTopTenBooks = async () => {
    const [topTenResult, libraryResult] = await Promise.all([
      supabase
        .from("books")
        .select("*")
        .eq("top_ten", true)
        .in("member_email", members.map((m) => m.email))
        .order("top_ten_rank", { ascending: true, nullsFirst: false }),
      supabase
        .from("books")
        .select("*")
        .eq("in_library", true)
        .in("member_email", members.map((m) => m.email))
    ]);

    if (!topTenResult.error) {
      const grouped: Record<string, BookRow[]> = {};
      members.forEach((member) => {
        // Sort by top_ten_rank, with nulls at the end (sorted by created_at)
        const memberBooks = topTenResult.data
          ?.filter((book) => book.member_email === member.email) || [];
        
        memberBooks.sort((a, b) => {
          if (a.top_ten_rank == null && b.top_ten_rank == null) {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }
          if (a.top_ten_rank == null) return 1;
          if (b.top_ten_rank == null) return -1;
          return a.top_ten_rank - b.top_ten_rank;
        });
        
        grouped[member.email] = memberBooks.slice(0, 10);
      });
      setTopTenBooks(grouped);
    }

    if (!libraryResult.error) {
      const normalizedLibrary = ((libraryResult.data ?? []) as BookRow[]).map((r) => ({
        ...r,
        member_email: normEmail(r.member_email),
      }));
      setLibraryBooks(normalizedLibrary);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (targetIndex: number, memberEmail: string) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      handleDragEnd();
      return;
    }

    const userBooks = [...(topTenBooks[memberEmail] || [])];
    const [draggedBook] = userBooks.splice(draggedIndex, 1);
    userBooks.splice(targetIndex, 0, draggedBook);

    // Optimistically update UI
    setTopTenBooks((prev) => ({
      ...prev,
      [memberEmail]: userBooks,
    }));

    handleDragEnd();

    // Update ranks in database
    try {
      const updates = userBooks.map((book, index) => ({
        id: book.id,
        top_ten_rank: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("books")
          .update({ top_ten_rank: update.top_ten_rank })
          .eq("id", update.id);
      }
    } catch (e) {
      console.error("Error updating ranks:", e);
      // Refresh to restore correct order on error
      await refreshTopTenBooks();
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
        .update({ top_ten: false })
        .eq("id", bookToDelete.id);

      if (error) throw new Error(error.message);

      await refreshTopTenBooks();
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
              {m.name}&apos;s Top 10
            </Typography>
          </Box>
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
              onEdit={openEditDialog}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(index, m.email)}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index}
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
              onEdit={openEditDialog}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(index, m.email)}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index}
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
                        {m.name}&apos;s Top 10
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.75 }}>
                        {books.length} / 10 books
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
                inputRef={searchInputRef}
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
                disabled={searchLoading}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                {searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              </Button>
            </Box>

            {/* Search Results */}
            {showResults && (
              <Box sx={{ mt: 1, maxHeight: 350, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {searchLoading ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
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
                              secondary={book.author || 'Unknown author'}
                              primaryTypographyProps={{ noWrap: true }}
                              secondaryTypographyProps={{ noWrap: true }}
                            />
                          </Box>
                        </ListItemButton>
                      ))}
                    </List>
                    {hasMoreResults && (
                      <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
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
                  <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                    No results found. Enter details manually below.
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Selected Book Preview with Cover Upload */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <BookCoverImage
              coverUrl={formCoverUrl}
              title={formTitle || "Book"}
              variant="large"
            />
            <Box sx={{ ml: 2, flex: 1 }}>
              {formTitle && (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{formTitle}</Typography>
                  <Typography variant="caption" color="text.secondary">{formAuthor}</Typography>
                </>
              )}
              {/* Cover Upload Button */}
              <Box sx={{ mt: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileSelect}
                  style={{ display: "none" }}
                  id="top-ten-cover-upload"
                />
                <label htmlFor="top-ten-cover-upload">
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

      {/* Duplicate Book Dialog */}
      <Dialog open={duplicateDialogOpen} onClose={handleDuplicateCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Book Already in Library</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            <strong>{formTitle}</strong> already exists in your library. What would you like to do?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Replace</strong>: Replace the library entry with this new Top Ten entry
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Add from Library</strong>: Add the existing library book to your Top Ten
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDuplicateCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleDuplicateAddFromLibrary} variant="outlined" disabled={saving}>
            Add from Library
          </Button>
          <Button onClick={handleDuplicateReplace} variant="contained" disabled={saving}>
            Replace
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Book Dialog */}
      <Dialog open={editDialogOpen} onClose={closeEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Top Ten Book</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {/* Cover Image with upload */}
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <BookCoverImage
                coverUrl={editCoverUrl}
                title={editTitle}
                width={100}
                height={150}
                editable
                pendingFile={pendingEditCoverFile}
                onFileSelect={(file, previewUrl) => {
                  setPendingEditCoverFile(file);
                  setEditCoverUrl(previewUrl);
                }}
              />
            </Box>

            <TextField
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Author"
              value={editAuthor}
              onChange={(e) => setEditAuthor(e.target.value)}
              fullWidth
            />

            <TextField
              label="Comment"
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: "text.secondary" }}>
                Rating *
              </Typography>
              <StarRating
                value={editRating}
                onChange={(val) => setEditRating(val)}
                size="medium"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog} disabled={savingEdit}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={savingEdit || !editTitle.trim() || !editRating}
          >
            {savingEdit ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
        <DialogTitle>Remove from Top Ten?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{bookToDelete?.title}</strong> from your Top Ten list?
            The book will remain in your library.
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
