"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Chip,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { getBookDetails, BookDetails, BookSearchResult } from "@/lib/bookSearch";

interface BookDetailsModalProps {
  open: boolean;
  onClose: () => void;
  /** Book info to display - can be from DB or search result */
  book: {
    title: string;
    author?: string | null;
    coverUrl?: string | null;
    genre?: string | null;
    summary?: string | null;
    /** Open Library key for fetching details */
    key?: string | null;
  } | null;
}

export default function BookDetailsModal({ open, onClose, book }: BookDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<BookDetails | null>(null);
  const [fetchedForTitle, setFetchedForTitle] = useState<string | null>(null);

  // Fetch book details when modal opens
  // Use book.title as stable dependency instead of the entire book object
  const bookTitle = book?.title;
  const bookAuthor = book?.author;
  const bookCoverUrl = book?.coverUrl;
  const bookGenre = book?.genre;
  const bookSummary = book?.summary;
  const bookKey = book?.key;

  useEffect(() => {
    if (!open || !bookTitle) {
      setDetails(null);
      setFetchedForTitle(null);
      return;
    }

    // Don't re-fetch if we already fetched for this book
    if (fetchedForTitle === bookTitle) {
      return;
    }

    // If we already have a summary, use it
    if (bookSummary) {
      setDetails({
        title: bookTitle,
        author: bookAuthor || "Unknown Author",
        coverUrl: bookCoverUrl || undefined,
        genre: bookGenre || undefined,
        summary: bookSummary,
      });
      setFetchedForTitle(bookTitle);
      return;
    }

    // Otherwise, fetch from API
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const searchResult: BookSearchResult = {
          title: bookTitle,
          author: bookAuthor || "Unknown Author",
          coverUrl: bookCoverUrl || undefined,
          genre: bookGenre || undefined,
          key: bookKey || undefined,
        };

        const result = await getBookDetails(searchResult);
        setDetails(result);
        setFetchedForTitle(bookTitle);
      } catch (error) {
        console.error("Error fetching book details:", error);
        // Fall back to basic info
        setDetails({
          title: bookTitle,
          author: bookAuthor || "Unknown Author",
          coverUrl: bookCoverUrl || undefined,
          genre: bookGenre || undefined,
        });
        setFetchedForTitle(bookTitle);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [open, bookTitle, bookAuthor, bookCoverUrl, bookGenre, bookSummary, bookKey, fetchedForTitle]);

  if (!book) return null;

  // Use larger cover image if available (Open Library)
  const largeCoverUrl = bookCoverUrl?.replace("-M.jpg", "-L.jpg") || bookCoverUrl;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "background.paper",
          backgroundImage: "none",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            p: 3,
          }}
        >
          {/* Cover Image */}
          <Box sx={{ flexShrink: 0, display: "flex", justifyContent: "center" }}>
            {largeCoverUrl ? (
              <Avatar
                src={largeCoverUrl}
                alt={`Cover of ${book.title}`}
                variant="rounded"
                sx={{
                  width: { xs: 150, md: 200 },
                  height: { xs: 225, md: 300 },
                  boxShadow: 3,
                  "& img": { objectFit: "cover" },
                }}
              />
            ) : (
              <Box
                sx={{
                  width: { xs: 150, md: 200 },
                  height: { xs: 225, md: 300 },
                  bgcolor: "grey.300",
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: 3,
                }}
              >
                <MenuBookIcon sx={{ fontSize: 60, color: "grey.500" }} />
                <Typography variant="body2" sx={{ color: "grey.500", mt: 1 }}>
                  No cover
                </Typography>
              </Box>
            )}
          </Box>

          {/* Book Details */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {book.title}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "text.secondary", mb: 2 }}>
              by {book.author || "Unknown Author"}
            </Typography>

            {(details?.genre || book.genre) && (
              <Chip
                label={details?.genre || book.genre}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />
            )}

            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 4 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  Loading book summary...
                </Typography>
              </Box>
            ) : details?.summary ? (
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                  maxHeight: { xs: 200, md: 300 },
                  overflow: "auto",
                }}
              >
                {details.summary}
              </Typography>
            ) : (
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontStyle: "italic" }}
              >
                No summary available for this book.
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
