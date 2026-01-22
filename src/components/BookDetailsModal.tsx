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
  Rating,
  Collapse,
  IconButton,
  Link,
  Divider,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { getBookDetails, BookDetails, BookSearchResult, RatingSource } from "@/lib/bookSearch";
import { supabase } from "@/lib/supabaseClient";

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
  const [ratingsExpanded, setRatingsExpanded] = useState(false);
  const [bookBrosRating, setBookBrosRating] = useState<RatingSource | null>(null);

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

    // Always fetch from API to get ratings from all sources
    // Even if we have a summary, we want the ratings data
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
        
        // If we already have a summary from the database, prefer that
        if (bookSummary && !result.summary) {
          result.summary = bookSummary;
        }
        
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
          summary: bookSummary || undefined,
        });
        setFetchedForTitle(bookTitle);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [open, bookTitle, bookAuthor, bookCoverUrl, bookGenre, bookSummary, bookKey, fetchedForTitle]);

  // Fetch Book Bros ratings from the database
  useEffect(() => {
    if (!open || !bookTitle) {
      setBookBrosRating(null);
      return;
    }

    const fetchBookBrosRatings = async () => {
      try {
        // Query the books table for ratings from Book Bros members
        // Use ilike with wildcards for flexible matching
        const searchTitle = `%${bookTitle.replace(/[%_]/g, '\\$&')}%`;
        const { data, error } = await supabase
          .from('books')
          .select('rating, member_email, title')
          .ilike('title', searchTitle)
          .not('rating', 'is', null);

        if (error) {
          // Only log if there's actual error info
          if (error.message || error.code) {
            console.warn('Book Bros ratings query failed:', error.message || error.code);
          }
          return;
        }

        if (data && data.length > 0) {
          // Filter for exact title match (case-insensitive) to avoid false positives
          const exactMatches = data.filter(b => 
            b.title?.toLowerCase().trim() === bookTitle.toLowerCase().trim()
          );
          
          const ratingsToUse = exactMatches.length > 0 ? exactMatches : data;
          const ratings = ratingsToUse.filter(b => b.rating !== null);
          
          if (ratings.length > 0) {
            const avgRating = ratings.reduce((sum, b) => sum + (b.rating || 0), 0) / ratings.length;
            setBookBrosRating({
              source: 'bookBros',
              rating: avgRating,
              ratingsCount: ratings.length,
              label: 'Book Bros',
            });
          }
        }
      } catch {
        // Silently fail - Book Bros ratings are optional enhancement
      }
    };

    fetchBookBrosRatings();
  }, [open, bookTitle]);

  // Reset expanded state when modal closes
  useEffect(() => {
    if (!open) {
      setRatingsExpanded(false);
    }
  }, [open]);

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
                sx={{ mb: 1 }}
              />
            )}

            {/* Rating from API - Clickable to expand */}
            {(details?.rating || bookBrosRating) && (
              <Box sx={{ mb: 2 }}>
                <Box
                  onClick={() => setRatingsExpanded(!ratingsExpanded)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    cursor: "pointer",
                    p: 1,
                    mx: -1,
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" },
                    transition: "background-color 0.2s",
                  }}
                >
                  <Rating
                    value={details?.rating || bookBrosRating?.rating || 0}
                    precision={0.1}
                    readOnly
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {(details?.rating || bookBrosRating?.rating || 0).toFixed(1)}
                    {details?.ratingsCount && ` (${details.ratingsCount.toLocaleString()} ratings)`}
                  </Typography>
                  <IconButton size="small" sx={{ ml: "auto" }}>
                    {ratingsExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                </Box>

                {/* Expanded ratings from all sources */}
                <Collapse in={ratingsExpanded}>
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      bgcolor: "action.hover",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Ratings by Source
                    </Typography>
                    
                    {/* Book Bros Rating - Show first */}
                    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                      <Typography variant="body2" fontWeight={500} color="primary" sx={{ minWidth: "fit-content" }}>
                        📚 Book Bros
                      </Typography>
                      {bookBrosRating?.rating ? (
                        <>
                          <Rating value={bookBrosRating.rating} precision={0.1} readOnly size="small" />
                          <Typography variant="body2" color="text.secondary">
                            {bookBrosRating.rating.toFixed(1)}
                            {bookBrosRating.ratingsCount && ` (${bookBrosRating.ratingsCount} member${bookBrosRating.ratingsCount > 1 ? 's' : ''})`}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          Not rated yet
                        </Typography>
                      )}
                    </Box>
                    
                    {/* Open Library */}
                    {(() => {
                      const olSource = details?.ratingsSources?.find(s => s.source === 'openLibrary');
                      return (
                        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                          {olSource?.url ? (
                            <Link
                              href={olSource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: "fit-content" }}
                            >
                              <Typography variant="body2" fontWeight={500}>
                                📖 Open Library
                              </Typography>
                              <OpenInNewIcon sx={{ fontSize: 12 }} />
                            </Link>
                          ) : (
                            <Typography variant="body2" fontWeight={500} sx={{ minWidth: "fit-content" }}>
                              📖 Open Library
                            </Typography>
                          )}
                          {olSource?.rating ? (
                            <>
                              <Rating value={olSource.rating} precision={0.1} readOnly size="small" />
                              <Typography variant="body2" color="text.secondary">
                                {olSource.rating.toFixed(1)}
                                {olSource.ratingsCount && ` (${olSource.ratingsCount.toLocaleString()})`}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              No rating available
                            </Typography>
                          )}
                        </Box>
                      );
                    })()}
                    
                    {/* Google Books */}
                    {(() => {
                      const gbSource = details?.ratingsSources?.find(s => s.source === 'googleBooks');
                      return (
                        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                          {gbSource?.url ? (
                            <Link
                              href={gbSource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: "fit-content" }}
                            >
                              <Typography variant="body2" fontWeight={500}>
                                📕 Google Books
                              </Typography>
                              <OpenInNewIcon sx={{ fontSize: 12 }} />
                            </Link>
                          ) : (
                            <Typography variant="body2" fontWeight={500} sx={{ minWidth: "fit-content" }}>
                              📕 Google Books
                            </Typography>
                          )}
                          {gbSource?.rating ? (
                            <>
                              <Rating value={gbSource.rating} precision={0.1} readOnly size="small" />
                              <Typography variant="body2" color="text.secondary">
                                {gbSource.rating.toFixed(1)}
                                {gbSource.ratingsCount && ` (${gbSource.ratingsCount.toLocaleString()})`}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              No rating available
                            </Typography>
                          )}
                        </Box>
                      );
                    })()}
                    
                    {/* NY Times */}
                    {(() => {
                      const nytSource = details?.ratingsSources?.find(s => s.source === 'nyTimes');
                      return (
                        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                          {nytSource?.url ? (
                            <Link
                              href={nytSource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: "fit-content" }}
                            >
                              <Typography variant="body2" fontWeight={500}>
                                📰 NY Times
                              </Typography>
                              <OpenInNewIcon sx={{ fontSize: 12 }} />
                            </Link>
                          ) : (
                            <Typography variant="body2" fontWeight={500} sx={{ minWidth: "fit-content" }}>
                              📰 NY Times
                            </Typography>
                          )}
                          {nytSource ? (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              Reviewed ✓
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              No review found
                            </Typography>
                          )}
                        </Box>
                      );
                    })()}
                  </Box>
                </Collapse>
              </Box>
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
