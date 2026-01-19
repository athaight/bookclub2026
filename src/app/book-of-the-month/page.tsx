"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { BookOfTheMonthRow } from "@/types";
import { searchBooks, getBookDetails, BookSearchResult } from "@/lib/bookSearch";
import MemberAvatar from "@/components/MemberAvatar";
import BookCoverImage from "@/components/BookCoverImage";
import JourneyComments from "@/components/JourneyComments";
import { useProfiles } from "@/lib/useProfiles";

const normEmail = (s: string) => s.trim().toLowerCase();

// Member rotation starting from January 2026
// Order is based on the order in NEXT_PUBLIC_MEMBERS_JSON
const ROTATION_START = { year: 2026, month: 1 }; // January 2026

function getPickerOrder(): string[] {
  // Get member emails from environment variable (same source as getMembers)
  const raw = process.env.NEXT_PUBLIC_MEMBERS_JSON;
  if (!raw) return [];
  try {
    const members = JSON.parse(raw) as { email: string; name: string }[];
    return members.map(m => normEmail(m.email));
  } catch {
    return [];
  }
}

function getPickerForMonth(year: number, month: number): string {
  const pickerOrder = getPickerOrder();
  if (pickerOrder.length === 0) return "";
  
  // Calculate months since start
  const startMonths = ROTATION_START.year * 12 + (ROTATION_START.month - 1);
  const currentMonths = year * 12 + (month - 1);
  const monthsSinceStart = currentMonths - startMonths;
  
  // Get picker index (cycling through the members)
  const pickerIndex = ((monthsSinceStart % pickerOrder.length) + pickerOrder.length) % pickerOrder.length;
  return pickerOrder[pickerIndex];
}

function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthYear(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function BookOfTheMonthPage() {
  const members = useMemo(() => getMembers().map(m => ({ ...m, email: normEmail(m.email) })), []);
  const memberEmails = useMemo(() => members.map(m => m.email), [members]);
  const { profiles } = useProfiles(memberEmails);

  const [loading, setLoading] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [currentMonth] = useState(getCurrentYearMonth());
  const [bookOfMonth, setBookOfMonth] = useState<BookOfTheMonthRow | null>(null);
  
  // Summary modal state (for public users clicking cover)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  // Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formWhyPicked, setFormWhyPicked] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [bookSummary, setBookSummary] = useState<string | null>(null);
  const [bookGenre, setBookGenre] = useState<string | null>(null);
  const [formCoverUrl, setFormCoverUrl] = useState<string | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

  // Search state
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  // Calculate current picker
  const [year, month] = currentMonth.split("-").map(Number);
  const currentPickerEmail = getPickerForMonth(year, month);
  const currentPicker = members.find(m => m.email === currentPickerEmail);
  const isCurrentPicker = authedEmail === currentPickerEmail;

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ? normEmail(data.session.user.email) : null;
      
      if (email) {
        const member = members.find(m => m.email === email);
        if (member) {
          setAuthedEmail(email);
        }
      }
    }
    checkAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const email = session?.user?.email ? normEmail(session.user.email) : null;
      if (email) {
        const member = members.find(m => m.email === email);
        setAuthedEmail(member ? email : null);
      } else {
        setAuthedEmail(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [members]);

  // Fetch current month's book
  useEffect(() => {
    async function fetchBook() {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("book_of_the_month")
        .select("*")
        .eq("year_month", currentMonth)
        .single();

      if (!error && data) {
        setBookOfMonth(data);
      } else {
        setBookOfMonth(null);
      }
      
      setLoading(false);
    }
    fetchBook();
  }, [currentMonth]);

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

  async function handleSelectBook(book: BookSearchResult) {
    setSelectedBook(book);
    setFormCoverUrl(book.coverUrl || null);
    setPendingCoverFile(null);
    setSearchResults([]);
    setShowResults(false);
    if (searchInputRef.current) searchInputRef.current.value = "";
    
    // Fetch full details including summary
    setFetchingDetails(true);
    try {
      const details = await getBookDetails(book);
      setBookSummary(details.summary || null);
      setBookGenre(details.genre || null);
    } catch {
      // Failed to fetch details, user can add manually
    } finally {
      setFetchingDetails(false);
    }
  }

  function handleOpenDialog() {
    // Pre-fill if there's an existing selection
    if (bookOfMonth) {
      setSelectedBook({
        title: bookOfMonth.book_title,
        author: bookOfMonth.book_author,
        coverUrl: bookOfMonth.book_cover_url || undefined,
        genre: bookOfMonth.book_genre || undefined,
      });
      setBookSummary(bookOfMonth.book_summary || null);
      setBookGenre(bookOfMonth.book_genre || null);
      setFormWhyPicked(bookOfMonth.why_picked || "");
      setFormCoverUrl(bookOfMonth.book_cover_url || null);
    } else {
      setSelectedBook(null);
      setBookSummary(null);
      setBookGenre(null);
      setFormWhyPicked("");
      setFormCoverUrl(null);
    }
    setPendingCoverFile(null);
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setSelectedBook(null);
    setBookSummary(null);
    setBookGenre(null);
    setFormWhyPicked("");
    setFormCoverUrl(null);
    setPendingCoverFile(null);
    setSearchResults([]);
    setShowResults(false);
    if (searchInputRef.current) searchInputRef.current.value = "";
  }

  // Handle cover file selection in the edit dialog
  function handleDialogCoverSelect(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    setPendingCoverFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFormCoverUrl(previewUrl);
  }

  async function handleSave() {
    if (!authedEmail || !selectedBook) return;

    setSaving(true);

    try {
      // Determine final cover URL
      // Start with the original cover from the book or API
      let finalCoverUrl = selectedBook.coverUrl || null;
      let coverWasUploaded = false;

      // If user selected a new file, upload it
      if (pendingCoverFile) {
        const fileExt = pendingCoverFile.name.split(".").pop();
        const fileName = `botm_${currentMonth}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("book-covers")
          .upload(fileName, pendingCoverFile, { upsert: true });

        if (uploadError) throw new Error(`Cover upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from("book-covers").getPublicUrl(fileName);
        finalCoverUrl = urlData.publicUrl;
        coverWasUploaded = true;
      } else if (bookOfMonth?.book_cover_url) {
        // Keep existing cover if no new file and we're editing
        finalCoverUrl = bookOfMonth.book_cover_url;
      }

      const bookData = {
        year_month: currentMonth,
        picker_email: currentPickerEmail,
        book_title: selectedBook.title,
        book_author: selectedBook.author,
        book_cover_url: finalCoverUrl || null,
        book_summary: bookSummary || null,
        book_genre: bookGenre || null,
        why_picked: formWhyPicked.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (bookOfMonth) {
        // Update existing
        const { error } = await supabase
          .from("book_of_the_month")
          .update(bookData)
          .eq("id", bookOfMonth.id);

        if (error) throw new Error(error.message);
      } else {
        // Insert new
        const { error } = await supabase
          .from("book_of_the_month")
          .insert(bookData);

        if (error) throw new Error(error.message);
      }

      // Refresh data
      const { data } = await supabase
        .from("book_of_the_month")
        .select("*")
        .eq("year_month", currentMonth)
        .single();

      if (data) setBookOfMonth(data);

      handleCloseDialog();
    } catch (e) {
      alert(`Error saving: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ textAlign: "center", mb: 4, overflow: "hidden" }}>
        {/* Book of the Month title - slow up and in */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            Book of the Month
          </Typography>
        </motion.div>

        {/* January 2026 - fade up and in */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <Typography variant="h6" sx={{ color: "text.secondary", mb: 1 }}>
            {formatMonthYear(currentMonth)}
          </Typography>
        </motion.div>

        {/* Picker section - slide from center outward, wraps on small screens */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 1 }}>
          {/* "This month's book is picked by" - slide from center to left */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.9,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              This month&apos;s book is picked by
            </Typography>
          </motion.div>

          {/* Avatar & Name - slide from center to right */}
          {currentPicker && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.9,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MemberAvatar 
                  name={currentPicker.name} 
                  email={currentPicker.email} 
                  profiles={profiles} 
                  size="small" 
                  linkToProfile 
                />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {currentPicker.name}
                </Typography>
              </Box>
            </motion.div>
          )}
          {authedEmail && (
            <IconButton onClick={handleOpenDialog} color="primary" size="small">
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {bookOfMonth ? (
        <Box sx={{ maxWidth: 600, mx: "auto" }}>
          {/* Book Title - slide from center out to right */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.8,
              delay: 1.2,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Typography variant="h4" component="h2" sx={{ textAlign: "center", fontWeight: 600, mb: 1 }}>
              {bookOfMonth.book_title}
            </Typography>
          </motion.div>

          {/* Author - slide from center out to right (staggered) */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.7,
              delay: 1.35,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Typography variant="h6" sx={{ textAlign: "center", color: "text.secondary", mb: 3 }}>
              by {bookOfMonth.book_author}
            </Typography>
          </motion.div>

          {/* Large Cover - Parallax effect */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 4 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 1.5,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {bookOfMonth.book_cover_url ? (
                <Avatar
                  src={bookOfMonth.book_cover_url.replace("-M.jpg", "-L.jpg")}
                  alt={`Cover of ${bookOfMonth.book_title} by ${bookOfMonth.book_author}`}
                  variant="rounded"
                  onClick={() => setSummaryModalOpen(true)}
                  onKeyDown={(e) => e.key === "Enter" && setSummaryModalOpen(true)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View summary of ${bookOfMonth.book_title}`}
                  sx={{ 
                    width: 336, 
                    height: 504, 
                    boxShadow: 3,
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover, &:focus": {
                      transform: "scale(1.02)",
                      boxShadow: 6,
                      outline: "2px solid",
                      outlineColor: "primary.main",
                    },
                    "& img": { objectFit: "cover" }
                  }}
                />
              ) : (
                <Box
                  onClick={() => setSummaryModalOpen(true)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && setSummaryModalOpen(true)}
                  role="button"
                  tabIndex={0}
                  aria-label="No cover image available. Click to view book details."
                  sx={{
                    width: 240,
                    height: 360,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: 3,
                    cursor: "pointer",
                    "&:hover, &:focus": {
                      outline: "2px solid",
                      outlineColor: "primary.main",
                    },
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No cover image
                  </Typography>
                </Box>
              )}
            </motion.div>
            {bookOfMonth.book_summary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.8 }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ mt: 1, color: "text.secondary", cursor: "pointer" }}
                  onClick={() => setSummaryModalOpen(true)}
                >
                  Click cover to view summary
                </Typography>
              </motion.div>
            )}
          </Box>

          {/* Why Picked Accordion */}
          {bookOfMonth.why_picked && currentPicker && (
            <motion.div>
              <Accordion sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Why {currentPicker.name} Picked This Book</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                    {bookOfMonth.why_picked}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </motion.div>
          )}

          {/* Journey Comments Section */}
          <Box sx={{ mt: 4, mb: 4 }}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
              }}
            >
              <JourneyComments
                bookOfMonthId={bookOfMonth.id}
                currentUserEmail={authedEmail}
                profiles={profiles}
                members={members}
              />
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" sx={{ color: "text.secondary", mb: 2 }}>
            No book selected yet for {formatMonthYear(currentMonth)}
          </Typography>
          {authedEmail && (
            <Button variant="contained" onClick={handleOpenDialog}>
              Pick This Month&apos;s Book
            </Button>
          )}
        </Box>
      )}

      {/* Summary Modal - Opens when clicking cover */}
      <Dialog 
        open={summaryModalOpen} 
        onClose={() => setSummaryModalOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { 
            bgcolor: "background.paper",
            backgroundImage: "none",
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          {bookOfMonth && (
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3, p: 3 }}>
              {/* Cover Image */}
              {bookOfMonth.book_cover_url && (
                <Box sx={{ flexShrink: 0, display: "flex", justifyContent: "center" }}>
                  <Avatar
                    src={bookOfMonth.book_cover_url.replace("-M.jpg", "-L.jpg")}
                    alt={`Cover of ${bookOfMonth.book_title}`}
                    variant="rounded"
                    sx={{ 
                      width: 200, 
                      height: 300, 
                      boxShadow: 3,
                      "& img": { objectFit: "cover" }
                    }}
                  />
                </Box>
              )}
              
              {/* Book Details */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {bookOfMonth.book_title}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: "text.secondary", mb: 2 }}>
                  by {bookOfMonth.book_author}
                </Typography>
                
                {bookOfMonth.book_genre && (
                  <Typography variant="body2" sx={{ mb: 2, color: "primary.main", fontStyle: "italic" }}>
                    {bookOfMonth.book_genre}
                  </Typography>
                )}
                
                {bookOfMonth.book_summary ? (
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {bookOfMonth.book_summary}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                    No summary available for this book.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {bookOfMonth ? "Edit Book of the Month" : "Pick Book of the Month"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            {/* Book Search */}
            <Box sx={{ position: "relative" }}>
              <TextField
                label="Search for a book"
                inputRef={searchInputRef}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSearch} edge="end">
                      <SearchIcon />
                    </IconButton>
                  ),
                }}
              />

              {/* Search Results */}
              {showResults && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    bgcolor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    maxHeight: 350,
                    overflowY: "auto",
                    boxShadow: 3,
                  }}
                >
                  {searchLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : searchResults.length > 0 ? (
                    <List dense>
                      {searchResults.map((book, idx) => (
                        <ListItemButton key={idx} onClick={() => handleSelectBook(book)}>
                          <BookCoverImage
                            coverUrl={book.coverUrl}
                            title={book.title}
                            variant="small"
                            disableModal
                          />
                          <Box sx={{ ml: 1 }}>
                            <ListItemText
                              primary={book.title}
                              secondary={book.author}
                              primaryTypographyProps={{ noWrap: true }}
                              secondaryTypographyProps={{ noWrap: true }}
                            />
                          </Box>
                        </ListItemButton>
                      ))}
                      {hasMoreResults && (
                        <Box sx={{ p: 1, textAlign: "center" }}>
                          <Button
                            size="small"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                          >
                            {loadingMore ? "Loading..." : "Load more results"}
                          </Button>
                        </Box>
                      )}
                    </List>
                  ) : (
                    <Typography sx={{ p: 2, color: "text.secondary" }}>
                      No books found
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            {/* Selected Book Preview */}
            {selectedBook && (
              <Box sx={{ 
                p: 2, 
                bgcolor: "action.hover", 
                borderRadius: 1,
              }}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <BookCoverImage
                    coverUrl={formCoverUrl}
                    title={selectedBook.title}
                    variant="large"
                    disableModal
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {selectedBook.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      by {selectedBook.author}
                    </Typography>
                    {fetchingDetails ? (
                      <Typography variant="caption" color="text.secondary">
                        Fetching details...
                      </Typography>
                    ) : (
                      bookGenre && (
                        <Typography variant="caption" color="text.secondary">
                          Genre: {bookGenre}
                        </Typography>
                      )
                    )}
                  </Box>
                </Box>
                
                {/* Cover Upload in Dialog */}
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDialogCoverSelect}
                    style={{ display: "none" }}
                    id="dialog-cover-upload"
                  />
                  <label htmlFor="dialog-cover-upload">
                    <Button
                      component="span"
                      variant="outlined"
                      size="small"
                      startIcon={<AddPhotoAlternateIcon />}
                    >
                      {formCoverUrl ? "Change Cover Image" : "Upload Cover Image"}
                    </Button>
                  </label>
                  {pendingCoverFile && (
                    <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                      New image selected
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Book Summary - editable by admin */}
            <TextField
              label="Book Summary"
              value={bookSummary || ""}
              onChange={(e) => setBookSummary(e.target.value)}
              multiline
              rows={4}
              placeholder="Add a summary of the book..."
              fullWidth
              helperText={bookSummary ? "" : "No summary from API - add your own!"}
            />

            {/* Why Picked */}
            <TextField
              label={`Why did you pick this book?`}
              value={formWhyPicked}
              onChange={(e) => setFormWhyPicked(e.target.value)}
              multiline
              rows={4}
              placeholder="Tell others why you chose this book..."
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !selectedBook}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
