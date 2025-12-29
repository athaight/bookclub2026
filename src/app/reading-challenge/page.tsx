"use client";

import { useEffect, useMemo, useState } from "react";
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
  Collapse,
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
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { useProfiles } from "@/lib/useProfiles";
import { BookRow } from "@/types";
import { searchBooks, BookSearchResult } from "@/lib/bookSearch";
import StarRating from "@/components/StarRating";
import MemberAvatar from "@/components/MemberAvatar";

type Member = { email: string; name: string };

type Bucket = { current?: BookRow; completed: BookRow[] };

const normEmail = (s: string) => s.trim().toLowerCase();

function rankLabel(rankIndex: number) {
  if (rankIndex === 0) return "Bibliophile";
  if (rankIndex === 1) return "Bookworm";
  return "Bookish";
}

function BookCard({
  row,
  canDelete,
  onDelete,
  rightAction,
}: {
  row: BookRow;
  canDelete?: boolean;
  onDelete?: (row: BookRow) => void;
  rightAction?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const comment = (row.comment ?? "").trim();
  const hasComment = comment.length > 0;

  return (
    <Card sx={{ mb: 1 }}>
      <CardContent sx={{ pb: 1.5 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          {row.cover_url && (
            <Avatar
              src={row.cover_url}
              variant="rounded"
              sx={{ width: 40, height: 60, flexShrink: 0 }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h3" noWrap>
              {(row.title ?? "").trim() || "—"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }} noWrap>
              {(row.author ?? "").trim() || "—"}
            </Typography>
          </Box>

          {rightAction}

          {canDelete && onDelete && (
            <IconButton aria-label="delete" onClick={() => onDelete(row)} size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}

          {hasComment && (
            <IconButton
              aria-label="toggle why"
              onClick={() => setOpen((v) => !v)}
              size="small"
              sx={{
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 150ms ease",
                mt: 0.25,
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {hasComment && (
          <Collapse in={open}>
            <Typography variant="body2" sx={{ fontStyle: "italic", mt: 1 }}>
              {comment}
            </Typography>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
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

  const [rows, setRows] = useState<BookRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [editingCurrent, setEditingCurrent] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftComment, setDraftComment] = useState("");
  const [draftCoverUrl, setDraftCoverUrl] = useState<string | null>(null);
  const [markCompleted, setMarkCompleted] = useState(false);
  const [draftRating, setDraftRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Book search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BookRow | null>(null);

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

    // 2026 Reading Challenge
    const challengeYear = 2026;

    // Fetch books added for this year's reading challenge
    // Uses reading_challenge_year column to track which books belong to the challenge
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .in(
        "member_email",
        members.map((m) => m.email)
      )
      .eq("reading_challenge_year", challengeYear);

    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }

    const normalized = ((data ?? []) as BookRow[]).map((r) => ({
      ...r,
      member_email: normEmail(r.member_email),
    }));

    setRows(normalized);
  }

  useEffect(() => {
    if (!checkingSession) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingSession]);

  if (checkingSession) return <Typography>Loading…</Typography>;
  if (err) return <Typography color="error">DB error: {err}</Typography>;

  // Library books are excluded from the query, so all fetched books can be displayed
  const byEmail: Record<string, Bucket> = {};
  for (const m of members) byEmail[m.email] = { completed: [] };

  for (const r of rows) {
    const bucket = byEmail[r.member_email];
    if (!bucket) continue;
    if (r.status === "current") bucket.current = r;
    else bucket.completed.push(r);
  }

  for (const email of Object.keys(byEmail)) {
    byEmail[email].completed.sort(
      (a, b) =>
        new Date(b.completed_at ?? b.created_at).getTime() -
        new Date(a.completed_at ?? a.created_at).getTime()
    );
  }

  const scored = members
    .map((m) => ({
      ...m,
      completedCount: byEmail[m.email]?.completed.length ?? 0,
    }))
    .sort((a, b) => b.completedCount - a.completedCount);

  const orderedForDesktop =
    scored.length === 3 ? [scored[1], scored[0], scored[2]] : scored;
  const orderedForMobile = scored;

  function resetEditorToBlank() {
    setDraftTitle("");
    setDraftAuthor("");
    setDraftComment("");
    setDraftCoverUrl(null);
    setMarkCompleted(false);
    setDraftRating(null);
    setEditingCurrent(false);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }

  function loadEditorFromCurrent(current: BookRow) {
    setDraftTitle(current.title ?? "");
    setDraftAuthor(current.author ?? "");
    setDraftComment((current.comment ?? "").slice(0, 200));
    setDraftCoverUrl(current.cover_url ?? null);
    setMarkCompleted(false);
    setDraftRating(null);
    setEditingCurrent(true);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }

  // Book search handlers
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
    setDraftTitle(book.title);
    setDraftAuthor(book.author);
    setDraftCoverUrl(book.coverUrl || null);
    setSearchResults([]);
    setShowResults(false);
    setSearchQuery("");
  }

  async function saveCurrent(memberEmail: string) {
    const title = draftTitle.trim();
    const author = draftAuthor.trim();
    const comment = draftComment.trim();

    if (!title) {
      setErr("Title is required.");
      return;
    }
    if (comment.length > 200) {
      setErr("Comment must be 200 characters or less.");
      return;
    }

    setSaving(true);
    setErr(null);

    const current = byEmail[memberEmail]?.current;
    // 2026 Reading Challenge
    const challengeYear = 2026;

    try {
      if (!current) {
        // Adding a new book - either as current or directly as completed
        // Mark with reading_challenge_year so it appears in this year's challenge
        // If marked as completed immediately, also add to library
        const { error } = await supabase.from("books").insert({
          member_email: memberEmail,
          status: markCompleted ? "completed" : "current",
          title,
          author: author || "",
          comment: comment || "",
          cover_url: draftCoverUrl || null,
          completed_at: markCompleted ? new Date().toISOString() : null,
          rating: markCompleted ? draftRating : null,
          reading_challenge_year: challengeYear,
          in_library: markCompleted ? true : false,
        });
        if (error) throw new Error(error.message);
        await refresh();
        resetEditorToBlank();
        return;
      }

      const { error: updateErr } = await supabase
        .from("books")
        .update({
          title,
          author: author || "",
          comment: comment || "",
          cover_url: draftCoverUrl || null,
        })
        .eq("id", current.id);

      if (updateErr) throw new Error(updateErr.message);

      if (markCompleted) {
        // When marking as completed, also add to library
        const { error: completeErr } = await supabase
          .from("books")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            rating: draftRating,
            in_library: true,
          })
          .eq("id", current.id);

        if (completeErr) throw new Error(completeErr.message);
        resetEditorToBlank();
      } else {
        setEditingCurrent(false);
        setMarkCompleted(false);
      }

      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(row: BookRow) {
    setSaving(true);
    setErr(null);

    try {
      const { error } = await supabase.from("books").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  function renderCurrentBlock(memberEmail: string) {
    const bucket = byEmail[memberEmail] ?? { completed: [] };
    const current = bucket.current;
    const isOwner = authedEmail === memberEmail;

    // If owner + editing: show editor
    if (isOwner && editingCurrent) {
      return (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="overline">Current book (edit)</Typography>

            {/* Book Search Section */}
            <Box>
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
                <Box sx={{ mt: 1, maxHeight: 160, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
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
                              sx={{ width: 28, height: 42, mr: 1.5 }}
                            />
                          )}
                          <ListItemText
                            primary={book.title}
                            secondary={book.author || 'Unknown author'}
                            primaryTypographyProps={{ noWrap: true, variant: 'body2' }}
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

            {/* Selected Book Preview */}
            {draftCoverUrl && (
              <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Avatar
                  src={draftCoverUrl}
                  variant="rounded"
                  sx={{ width: 40, height: 60, mr: 1.5 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 'medium' }}>{draftTitle}</Typography>
                  <Typography variant="caption" noWrap color="text.secondary">{draftAuthor}</Typography>
                </Box>
              </Box>
            )}

            <TextField
              label="Title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="Author"
              value={draftAuthor}
              onChange={(e) => setDraftAuthor(e.target.value)}
              fullWidth
            />
            <TextField
              label="Why this book?"
              value={draftComment}
              onChange={(e) => setDraftComment(e.target.value.slice(0, 200))}
              helperText={`${draftComment.length}/200`}
              multiline
              minRows={2}
              fullWidth
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={markCompleted}
                  onChange={(e) => setMarkCompleted(e.target.checked)}
                />
              }
              label={current ? "Mark this current book as completed" : "Add as completed (already finished reading)"}
            />

            {markCompleted && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Rating (optional):
                </Typography>
                <StarRating value={draftRating} onChange={setDraftRating} />
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button variant="text" onClick={() => setEditingCurrent(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                startIcon={<SaveIcon />}
                onClick={() => saveCurrent(memberEmail)}
                disabled={saving}
                variant="contained"
              >
                Save
              </Button>
            </Box>
          </CardContent>
        </Card>
      );
    }

    // Otherwise: show current card (with caret expander) + Edit button for owner
    if (current) {
      return (
        <Card sx={{ height: 120 }}>
          <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flex: 1 }}>
              {current.cover_url && (
                <Avatar
                  src={current.cover_url}
                  variant="rounded"
                  sx={{ width: 40, height: 60, flexShrink: 0 }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" component="h3" noWrap>
                  {(current.title ?? "").trim() || "—"}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }} noWrap>
                  {(current.author ?? "").trim() || "—"}
                </Typography>
              </Box>
              {isOwner && (
                <IconButton
                  aria-label="edit current"
                  onClick={() => loadEditorFromCurrent(current)}
                  size="small"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </CardContent>
        </Card>
      );
    }

    // No current saved yet
    if (isOwner) {
      return (
        <Card sx={{ height: 120 }}>
          <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
              No current book saved yet.
            </Typography>
            <Button
              startIcon={<EditIcon />}
              onClick={() => {
                resetEditorToBlank();
                setEditingCurrent(true);
              }}
              variant="outlined"
              size="small"
            >
              Add
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card sx={{ height: 120 }}>
        <CardContent sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="body1" sx={{ opacity: 0.5 }}>
            —
          </Typography>
        </CardContent>
      </Card>
    );
  }

  function renderDesktopColumn(m: Member, rankIndex: number) {
    const bucket = byEmail[m.email] ?? { completed: [] };

    return (
      <Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mt: 3, mb: 1 }}>
          {rankLabel(rankIndex)}
        </Typography>

        <Box
          sx={{
            position: "sticky",
            top: 8,
            zIndex: 5,
            backgroundColor: "background.default",
            pb: 1,
          }}
        >
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            {m.name}
          </Typography>

          {renderCurrentBlock(m.email)}
        </Box>

        {bucket.completed.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" component="h3" sx={{ mb: 1.5 }}>
              Books read
            </Typography>
          </>
        )}

        {bucket.completed.map((b) => (
          <BookCard
            key={b.id}
            row={b}
            canDelete={authedEmail === m.email}
            onDelete={(row) => setDeleteTarget(row)}
          />
        ))}
      </Box>
    );
  }

  function renderMobileDetails(m: Member) {
    const bucket = byEmail[m.email] ?? { completed: [] };

    return (
      <>
        {renderCurrentBlock(m.email)}

        {bucket.completed.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" component="h3" sx={{ mb: 1.5 }}>
              Books read
            </Typography>
          </>
        )}

        {bucket.completed.map((b) => (
          <BookCard
            key={b.id}
            row={b}
            canDelete={authedEmail === m.email}
            onDelete={(row) => setDeleteTarget(row)}
          />
        ))}
      </>
    );
  }

  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Reading Challenge
        </Typography>
        <Typography variant="h6" component="p" sx={{ mb: 2 }}>
          2026
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 700, mx: 'auto', color: 'text.secondary' }}>
          Our 2026 challenge is to see who reads the most books this year. Here, you&apos;ll see what we&apos;re currently reading and what we&apos;ve finished to determine which one of us is a true Bibliophile (1st place), or could be considered a Bookworm (2nd place), or just Bookish (3rd place).
        </Typography>
      </Box>

      {err && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{err}</Typography>
        </Box>
      )}

      {isMobile && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {orderedForMobile.map((m, rankIndex) => {
            const bucket = byEmail[m.email] ?? { completed: [] };
            const currentTitle = bucket.current?.title?.trim() || "—";
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
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                        {rankLabel(rankIndex)}
                      </Typography>
                      <Typography
                        component={Link}
                        href="/profiles"
                        variant="subtitle1"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        sx={{
                          textDecoration: "none",
                          color: "inherit",
                          "&:hover": { color: "primary.main" },
                        }}
                      >
                        {m.name}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.75 }}>
                        Current: {currentTitle}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>{renderMobileDetails(m)}</AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {!isMobile && (
        <>
          {/* Sticky Column Headers */}
          <Box
            sx={{
              position: "sticky",
              top: 64, // Account for header height
              zIndex: 10,
              bgcolor: "background.default",
              pt: 2,
              pb: 1,
              mb: 1,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 2,
              }}
            >
              {orderedForDesktop.map((m) => {
                const rankIndex = scored.findIndex((s) => s.email === m.email);
                return (
                  <Box key={m.email} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      component={Link}
                      href="/profiles"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        textDecoration: "none",
                        color: "inherit",
                        "&:hover": { color: "primary.main" },
                      }}
                    >
                      <MemberAvatar name={m.name} email={m.email} profiles={profiles} size="large" />
                      <Typography
                        variant="body1"
                        sx={{ color: "text.secondary" }}
                      >
                        {m.name}
                      </Typography>
                    </Box>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>
                      {rankLabel(rankIndex)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Current Reading Section Header */}
          <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
            Current book
          </Typography>

          {/* Current Reading Cards - Fixed Height */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
            }}
          >
            {orderedForDesktop.map((m) => {
              return (
                <Box key={m.email}>
                  {renderCurrentBlock(m.email)}
                </Box>
              );
            })}
          </Box>

          {/* Books Read Section - Aligned Header */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
            Books read
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
            }}
          >
            {orderedForDesktop.map((m) => {
              const bucket = byEmail[m.email] ?? { completed: [] };
              return (
                <Box key={m.email}>
                  {bucket.completed.length > 0 ? (
                    bucket.completed.map((b) => (
                      <BookCard
                        key={b.id}
                        row={b}
                        canDelete={authedEmail === m.email}
                        onDelete={(row) => setDeleteTarget(row)}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                      No books read yet
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </>
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete book?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget ? deleteTarget.title : ""}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteTarget && deleteRow(deleteTarget)}
            disabled={saving || !deleteTarget}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}