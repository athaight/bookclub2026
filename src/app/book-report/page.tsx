"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Avatar,
  IconButton,
  FormControlLabel,
  Switch,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getMembers, Member } from "@/lib/members";
import { BookReportRow, ProfileRow } from "@/types";
import { searchBooks, BookSearchResult } from "@/lib/bookSearch";

const normEmail = (s: string) => s.trim().toLowerCase();
const MAX_REPORTS = 10;

export default function BookReportPage() {
  const [reports, setReports] = useState<BookReportRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | false>(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<BookReportRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<BookReportRow | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formBookTitle, setFormBookTitle] = useState("");
  const [formBookAuthor, setFormBookAuthor] = useState("");
  const [formBookCover, setFormBookCover] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formIsDraft, setFormIsDraft] = useState(false);

  // Book search
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState<BookSearchResult[]>([]);
  const [searchingBooks, setSearchingBooks] = useState(false);

  const members = useMemo(() => getMembers(), []);

  // Check auth (non-blocking - page works for everyone)
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email
        ? normEmail(data.session.user.email)
        : null;

      if (email) {
        const member = members.find((m) => normEmail(m.email) === email);
        if (member) {
          setAuthedEmail(email);
        }
      }
    }
    checkAuth();
  }, [members]);

  // Fetch reports and profiles
  useEffect(() => {
    async function fetchData() {
      const [reportsRes, profilesRes] = await Promise.all([
        supabase
          .from("book_reports")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase.from("profiles").select("*"),
      ]);

      if (reportsRes.data) setReports(reportsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Filter reports based on auth status
  // Admins see all their reports (including drafts) + all published
  // Public sees only published
  const visibleReports = useMemo(() => {
    if (!authedEmail) {
      return reports.filter((r) => r.status === "published");
    }
    // Admin: see their own drafts + all published
    return reports.filter(
      (r) => r.status === "published" || r.user_email === authedEmail
    );
  }, [reports, authedEmail]);

  // Group reports by user
  const reportsByUser = useMemo(() => {
    const grouped: Record<string, BookReportRow[]> = {};
    for (const report of visibleReports) {
      if (!grouped[report.user_email]) {
        grouped[report.user_email] = [];
      }
      grouped[report.user_email].push(report);
    }
    return grouped;
  }, [visibleReports]);

  const getProfile = (email: string) => profiles.find((p) => p.email === email);

  const getReadingTime = (content: string) => {
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / 200);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleAccordionChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  // Get current user's report count (all reports, not just visible)
  const currentUserReportCount = authedEmail
    ? reports.filter((r) => r.user_email === authedEmail).length
    : 0;

  // Open dialog for new report
  const handleNewReport = () => {
    setEditingReport(null);
    setFormTitle("");
    setFormBookTitle("");
    setFormBookAuthor("");
    setFormBookCover("");
    setFormContent("");
    setFormIsDraft(false);
    setBookSearchQuery("");
    setBookSearchResults([]);
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEditReport = (report: BookReportRow) => {
    setEditingReport(report);
    setFormTitle(report.title);
    setFormBookTitle(report.book_title);
    setFormBookAuthor(report.book_author || "");
    setFormBookCover(report.book_cover_url || "");
    setFormContent(report.content);
    setFormIsDraft(report.status === "draft");
    setBookSearchQuery("");
    setBookSearchResults([]);
    setDialogOpen(true);
  };

  // Book search
  const handleBookSearch = async () => {
    if (!bookSearchQuery.trim()) return;
    setSearchingBooks(true);
    const results = await searchBooks(bookSearchQuery);
    setBookSearchResults(results);
    setSearchingBooks(false);
  };

  const handleSelectBook = (book: BookSearchResult) => {
    setFormBookTitle(book.title);
    setFormBookAuthor(book.author || "");
    setFormBookCover(book.coverUrl || "");
    setBookSearchResults([]);
    setBookSearchQuery("");
  };

  // Save report
  const handleSave = async () => {
    if (!authedEmail || !formTitle.trim() || !formBookTitle.trim()) return;

    setSaving(true);

    const reportData = {
      title: formTitle.trim(),
      book_title: formBookTitle.trim(),
      book_author: formBookAuthor.trim() || null,
      book_cover_url: formBookCover.trim() || null,
      content: formContent,
      status: (formIsDraft ? "draft" : "published") as "draft" | "published",
      updated_at: new Date().toISOString(),
    };

    if (editingReport) {
      // Update existing
      const { error } = await supabase
        .from("book_reports")
        .update(reportData)
        .eq("id", editingReport.id);

      if (!error) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === editingReport.id ? { ...r, ...reportData } : r
          )
        );
      }
    } else {
      // Create new
      const { data, error } = await supabase
        .from("book_reports")
        .insert({
          ...reportData,
          user_email: authedEmail,
        })
        .select()
        .single();

      if (!error && data) {
        setReports((prev) => [data, ...prev]);
      }
    }

    setSaving(false);
    setDialogOpen(false);
  };

  // Delete report
  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;

    const { error } = await supabase
      .from("book_reports")
      .delete()
      .eq("id", reportToDelete.id);

    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== reportToDelete.id));
    }

    setDeleteConfirmOpen(false);
    setReportToDelete(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasVisibleReports = Object.keys(reportsByUser).length > 0;

  return (
    <>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Book Reports
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Deep dives and thoughts on books we found extra juicy
        </Typography>

        {/* Admin: Show New Report button */}
        {authedEmail && (
          <>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewReport}
              disabled={currentUserReportCount >= MAX_REPORTS}
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              New Book Report
            </Button>

            {currentUserReportCount >= MAX_REPORTS && (
              <Alert severity="info" sx={{ mt: 2, maxWidth: 500, mx: "auto" }}>
                You&apos;ve reached the maximum of {MAX_REPORTS} book reports.
                Delete one to create a new one.
              </Alert>
            )}
          </>
        )}
      </Box>

      {/* No reports message */}
      {!hasVisibleReports ? (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Card
            sx={{
              maxWidth: 600,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: "bold",
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}
              >
                No reports written because school was hard.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          {members.map((member: Member) => {
            const userReports = reportsByUser[member.email] || [];
            const profile = getProfile(member.email);
            const isCurrentUser = authedEmail
              ? normEmail(member.email) === authedEmail
              : false;

            // Skip members with no visible reports (unless it's current user who is admin)
            if (userReports.length === 0 && !isCurrentUser) return null;
            if (userReports.length === 0 && isCurrentUser && !authedEmail)
              return null;

            return (
              <Accordion
                key={member.email}
                expanded={expanded === member.email}
                onChange={handleAccordionChange(member.email)}
                sx={{ mb: 1 }}
                defaultExpanded={isCurrentUser}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      src={profile?.avatar_url || undefined}
                      sx={{ width: 48, height: 48 }}
                    >
                      {member.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {profile?.display_name || member.name}
                        {isCurrentUser && (
                          <Chip
                            label="You"
                            size="small"
                            sx={{ ml: 1 }}
                            color="primary"
                          />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {userReports.filter((r) => r.status === "published").length}{" "}
                        published report
                        {userReports.filter((r) => r.status === "published")
                          .length !== 1
                          ? "s"
                          : ""}
                        {isCurrentUser &&
                          userReports.filter((r) => r.status === "draft").length >
                            0 &&
                          ` • ${userReports.filter((r) => r.status === "draft").length} draft`}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {userReports.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No book reports yet. Click &quot;New Book Report&quot; to
                      create one!
                    </Typography>
                  ) : (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      {userReports.map((report) => (
                        <Card key={report.id} variant="outlined">
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 2,
                                alignItems: "flex-start",
                              }}
                            >
                              {/* Book Cover */}
                              {report.book_cover_url ? (
                                <Avatar
                                  src={report.book_cover_url}
                                  variant="rounded"
                                  sx={{ width: 80, height: 120, flexShrink: 0 }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 80,
                                    height: 120,
                                    flexShrink: 0,
                                    bgcolor: "grey.200",
                                    borderRadius: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    No Cover
                                  </Typography>
                                </Box>
                              )}

                              {/* Info */}
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    mb: 0.5,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {report.title}
                                  </Typography>
                                  {report.status === "draft" && (
                                    <Chip
                                      label="Draft"
                                      size="small"
                                      color="default"
                                    />
                                  )}
                                </Box>
                                <Typography variant="body1" sx={{ mb: 0.5 }}>
                                  {report.book_title}
                                </Typography>
                                {report.book_author && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 1.5 }}
                                  >
                                    by {report.book_author}
                                  </Typography>
                                )}

                                {/* Metrics */}
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                    mb: 2,
                                  }}
                                >
                                  <Chip
                                    icon={<AccessTimeIcon />}
                                    label={`${getReadingTime(report.content)} min read`}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip
                                    icon={<CalendarTodayIcon />}
                                    label={formatDate(report.updated_at)}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>

                                {/* Actions */}
                                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                  {/* Read button - only for published */}
                                  {report.status === "published" && (
                                    <Button
                                      component={Link}
                                      href={`/book-report/${report.id}`}
                                      variant="contained"
                                      size="small"
                                    >
                                      Read Book Report
                                    </Button>
                                  )}

                                  {/* Edit/Delete - only for owner */}
                                  {isCurrentUser && (
                                    <>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEditReport(report)}
                                        color="primary"
                                      >
                                        <EditIcon />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setReportToDelete(report);
                                          setDeleteConfirmOpen(true);
                                        }}
                                        color="error"
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingReport ? "Edit Book Report" : "New Book Report"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            {/* Book Search */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Search for a book
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Search by title or author..."
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBookSearch()}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleBookSearch}
                  disabled={searchingBooks}
                >
                  {searchingBooks ? <CircularProgress size={20} /> : "Search"}
                </Button>
              </Box>

              {/* Search Results */}
              {bookSearchResults.length > 0 && (
                <Box
                  sx={{
                    mt: 1,
                    maxHeight: 200,
                    overflow: "auto",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  {bookSearchResults.map((book, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                        borderBottom: 1,
                        borderColor: "divider",
                      }}
                      onClick={() => handleSelectBook(book)}
                    >
                      {book.coverUrl && (
                        <Avatar
                          src={book.coverUrl}
                          variant="rounded"
                          sx={{ width: 40, height: 60 }}
                        />
                      )}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {book.title}
                        </Typography>
                        {book.author && (
                          <Typography variant="caption" color="text.secondary">
                            {book.author}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* Report Title */}
            <TextField
              label="Report Title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g., Why This Book Changed My Perspective"
              required
            />

            {/* Book Details */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Book Title"
                value={formBookTitle}
                onChange={(e) => setFormBookTitle(e.target.value)}
                required
                sx={{ flex: 1 }}
              />
              <TextField
                label="Author"
                value={formBookAuthor}
                onChange={(e) => setFormBookAuthor(e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>

            {/* Cover URL (hidden but populated by search) */}
            {formBookCover && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  src={formBookCover}
                  variant="rounded"
                  sx={{ width: 60, height: 90 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Cover image loaded
                </Typography>
              </Box>
            )}

            {/* Content */}
            <TextField
              label="Report Content"
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              multiline
              rows={12}
              placeholder="Write your book report here..."
            />

            {/* Word count */}
            <Typography variant="caption" color="text.secondary">
              {formContent.trim().split(/\s+/).filter(Boolean).length} words •{" "}
              {Math.ceil(
                formContent.trim().split(/\s+/).filter(Boolean).length / 200
              )}{" "}
              min read
            </Typography>

            {/* Save as Draft Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={formIsDraft}
                  onChange={(e) => setFormIsDraft(e.target.checked)}
                />
              }
              label="Save as draft (not visible to others)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !formTitle.trim() || !formBookTitle.trim()}
            sx={{
              background: formIsDraft
                ? undefined
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            {saving ? (
              <CircularProgress size={20} />
            ) : formIsDraft ? (
              "Save as Draft"
            ) : (
              "Publish"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Book Report?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{reportToDelete?.title}&quot;?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
