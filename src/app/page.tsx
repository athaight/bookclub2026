"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { BookRow } from "@/types";

type Member = { email: string; name: string };

type Bucket = { current?: BookRow; completed: BookRow[] };

const normEmail = (s: string) => s.trim().toLowerCase();

function rankLabel(rankIndex: number) {
  if (rankIndex === 0) return "Bibliophile";
  if (rankIndex === 1) return "Bookworm";
  return "Can read gud";
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
  const [markCompleted, setMarkCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

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
          await supabase.auth.signOut();
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
          supabase.auth.signOut();
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

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .in(
        "member_email",
        members.map((m) => m.email)
      );

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
    setMarkCompleted(false);
    setEditingCurrent(false);
  }

  function loadEditorFromCurrent(current: BookRow) {
    setDraftTitle(current.title ?? "");
    setDraftAuthor(current.author ?? "");
    setDraftComment((current.comment ?? "").slice(0, 200));
    setMarkCompleted(false);
    setEditingCurrent(true);
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

    try {
      if (!current) {
        const { error } = await supabase.from("books").insert({
          member_email: memberEmail,
          status: "current",
          title,
          author: author || "",
          comment: comment || "",
        });
        if (error) throw new Error(error.message);
        await refresh();
        setEditingCurrent(false);
        setMarkCompleted(false);
        return;
      }

      const { error: updateErr } = await supabase
        .from("books")
        .update({
          title,
          author: author || "",
          comment: comment || "",
        })
        .eq("id", current.id);

      if (updateErr) throw new Error(updateErr.message);

      if (markCompleted) {
        const { error: completeErr } = await supabase
          .from("books")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
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

            {!!current && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={markCompleted}
                    onChange={(e) => setMarkCompleted(e.target.checked)}
                  />
                }
                label="Mark this current book as completed"
              />
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
        <>
          <Typography variant="overline" sx={{ display: "block", mb: 0.5 }}>
            Current book
          </Typography>

          <BookCard
            row={current}
            rightAction={
              isOwner ? (
                <IconButton
                  aria-label="edit current"
                  onClick={() => loadEditorFromCurrent(current)}
                  size="small"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              ) : null
            }
          />

          {isOwner && !current && (
            <Button variant="outlined" onClick={() => setEditingCurrent(true)}>
              Add current
            </Button>
          )}
        </>
      );
    }

    // No current saved yet
    if (isOwner) {
      return (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="overline">Current book</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
              No current book saved yet.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
              <Button
                startIcon={<EditIcon />}
                onClick={() => {
                  resetEditorToBlank();
                  setEditingCurrent(true);
                }}
                variant="outlined"
              >
                Add
              </Button>
            </Box>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="overline">Current book</Typography>
          <Typography variant="body1" sx={{ mt: 0.5 }}>
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
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                      {rankLabel(rankIndex)}
                    </Typography>
                    <Typography variant="subtitle1" component="h2">
                      {m.name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Current: {currentTitle}
                    </Typography>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>{renderMobileDetails(m)}</AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {!isMobile && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {orderedForDesktop.map((m) => {
            const rankIndex = scored.findIndex((s) => s.email === m.email);
            return (
              <Box key={m.email}>
                {renderDesktopColumn(m, rankIndex)}
              </Box>
            );
          })}
        </Box>
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