'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  CircularProgress,
  Popover,
  Avatar,
} from '@mui/material';
import {
  Send,
  Edit,
  Delete,
  Reply,
  MoreVert,
  AddReaction,
  Close,
  ChatBubbleOutline,
  MenuBook,
} from '@mui/icons-material';
import MemberAvatar from './MemberAvatar';
import { ProfileRow } from '@/types';

// Types
export interface BookComment {
  id: string;
  book_identifier: string;
  author_email: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
  reactions?: ReactionGroup[];
  replies?: BookComment[];
  mentions?: string[];
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
}

interface BookChatModalProps {
  open: boolean;
  onClose: () => void;
  book: {
    title: string;
    author?: string | null;
    coverUrl?: string | null;
  } | null;
  currentUserEmail: string | null;
  profiles: Record<string, ProfileRow>;
  members: { email: string; name: string }[];
  readOnly?: boolean;
}

// Common emoji reactions
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🎉', '🤔', '📚', '🔥', '👏'];

// Helper to create book identifier
function createBookIdentifier(title: string, author: string): string {
  return `${title.trim().toLowerCase()}::${(author || '').trim().toLowerCase()}`;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
}

// Parse mentions from content
function parseMentions(content: string, members: { email: string; name: string }[]): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const name = match[1].toLowerCase();
    const member = members.find(m => 
      m.name.toLowerCase().includes(name) || 
      m.email.split('@')[0].toLowerCase() === name
    );
    if (member) {
      mentions.push(member.email);
    }
  }
  
  return mentions;
}

// Render content with highlighted mentions
function renderContentWithMentions(
  content: string, 
  members: { email: string; name: string }[]
): React.ReactNode {
  const parts = content.split(/(@\w+)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      const name = part.slice(1).toLowerCase();
      const member = members.find(m => 
        m.name.toLowerCase().includes(name) || 
        m.email.split('@')[0].toLowerCase() === name
      );
      if (member) {
        return (
          <Chip
            key={index}
            label={part}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mx: 0.5, height: 22, fontSize: '0.85rem' }}
          />
        );
      }
    }
    return <span key={index}>{part}</span>;
  });
}

// Single Comment Component
interface CommentItemProps {
  comment: BookComment;
  currentUserEmail: string | null;
  profiles: Record<string, ProfileRow>;
  members: { email: string; name: string }[];
  onEdit: (commentId: string, newContent: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (parentId: string) => void;
  onReaction: (commentId: string, emoji: string, hasReacted: boolean) => Promise<void>;
  isReply?: boolean;
  readOnly?: boolean;
}

function CommentItem({
  comment,
  currentUserEmail,
  profiles,
  members,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  isReply = false,
  readOnly = false,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<null | HTMLElement>(null);
  const [saving, setSaving] = useState(false);

  const isOwner = currentUserEmail === comment.author_email;
  const isLoggedIn = !!currentUserEmail && !readOnly;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    await onEdit(comment.id, editContent);
    setIsEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    setMenuAnchor(null);
    await onDelete(comment.id);
  };

  const handleReaction = async (emoji: string) => {
    setEmojiAnchor(null);
    const hasReacted = comment.reactions?.some(
      r => r.emoji === emoji && r.users.includes(currentUserEmail!)
    ) || false;
    await onReaction(comment.id, emoji, hasReacted);
  };

  return (
    <Paper
      elevation={isReply ? 0 : 1}
      sx={{
        p: 2,
        mb: isReply ? 1 : 2,
        ml: isReply ? 4 : 0,
        bgcolor: isReply ? 'action.hover' : 'background.paper',
        borderLeft: isReply ? '3px solid' : 'none',
        borderLeftColor: 'primary.main',
      }}
    >
      {/* Header: Avatar, Name, Time */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <MemberAvatar
          name={comment.author_name || comment.author_email}
          email={comment.author_email}
          profiles={profiles}
          size="small"
        />
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {comment.author_name || comment.author_email.split('@')[0]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(comment.created_at)}
              {comment.updated_at !== comment.created_at && ' (edited)'}
            </Typography>
          </Box>

          {/* Content */}
          {isEditing ? (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                size="small"
                autoFocus
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveEdit}
                  disabled={saving || !editContent.trim()}
                >
                  {saving ? <CircularProgress size={16} /> : 'Save'}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography component="div" variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {renderContentWithMentions(comment.content, members)}
            </Typography>
          )}

          {/* Reactions */}
          {!isEditing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              {comment.reactions?.map((reaction) => {
                const hasReacted = currentUserEmail && reaction.users.includes(currentUserEmail);
                return (
                  <Tooltip
                    key={reaction.emoji}
                    title={reaction.users.map(e => 
                      members.find(m => m.email === e)?.name || e.split('@')[0]
                    ).join(', ')}
                  >
                    <Chip
                      label={`${reaction.emoji} ${reaction.count}`}
                      size="small"
                      variant={hasReacted ? 'filled' : 'outlined'}
                      color={hasReacted ? 'primary' : 'default'}
                      onClick={isLoggedIn ? () => handleReaction(reaction.emoji) : undefined}
                      sx={{ cursor: isLoggedIn ? 'pointer' : 'default' }}
                    />
                  </Tooltip>
                );
              })}
              
              {/* Add reaction button */}
              {isLoggedIn && (
                <>
                  <IconButton
                    size="small"
                    onClick={(e) => setEmojiAnchor(e.currentTarget)}
                    sx={{ ml: 0.5 }}
                  >
                    <AddReaction fontSize="small" />
                  </IconButton>
                  <Popover
                    open={Boolean(emojiAnchor)}
                    anchorEl={emojiAnchor}
                    onClose={() => setEmojiAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  >
                    <Box sx={{ p: 1, display: 'flex', gap: 0.5 }}>
                      {EMOJI_OPTIONS.map((emoji) => (
                        <IconButton
                          key={emoji}
                          size="small"
                          onClick={() => handleReaction(emoji)}
                          sx={{ fontSize: '1.25rem' }}
                        >
                          {emoji}
                        </IconButton>
                      ))}
                    </Box>
                  </Popover>
                </>
              )}

              {/* Reply button */}
              {isLoggedIn && !isReply && (
                <Button
                  size="small"
                  startIcon={<Reply />}
                  onClick={() => onReply(comment.id)}
                  sx={{ ml: 1 }}
                >
                  Reply
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* More menu for owner */}
        {isOwner && !isEditing && !readOnly && (
          <>
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem onClick={() => { setMenuAnchor(null); setIsEditing(true); }}>
                <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
              </MenuItem>
              <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserEmail={currentUserEmail}
              profiles={profiles}
              members={members}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              onReaction={onReaction}
              isReply
              readOnly={readOnly}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}

// Main Modal Component
export default function BookChatModal({
  open,
  onClose,
  book,
  currentUserEmail,
  profiles,
  members,
  readOnly = false,
}: BookChatModalProps) {
  const [comments, setComments] = useState<BookComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionAnchor, setMentionAnchor] = useState<null | HTMLElement>(null);
  const [mentionFilter, setMentionFilter] = useState('');
  const textFieldRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const bookIdentifier = book ? createBookIdentifier(book.title, book.author || '') : '';

  // Filter members for mention dropdown
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(mentionFilter.toLowerCase()) ||
    m.email.toLowerCase().includes(mentionFilter.toLowerCase())
  ).slice(0, 5);

  // Scroll to bottom of comments
  const scrollToBottom = useCallback(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!bookIdentifier) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/book-comments?bookIdentifier=${encodeURIComponent(bookIdentifier)}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [bookIdentifier]);

  useEffect(() => {
    if (open && bookIdentifier) {
      fetchComments();
    }
  }, [open, bookIdentifier, fetchComments]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setComments([]);
      setNewComment('');
      setReplyingTo(null);
      setError(null);
    }
  }, [open]);

  // Handle input change with mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // Check for @ mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      // Only show menu if we just typed @ or are typing a name
      if (textAfterAt === '' || /^\w*$/.test(textAfterAt)) {
        setMentionFilter(textAfterAt);
        setShowMentionMenu(true);
        setMentionAnchor(textFieldRef.current);
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowMentionMenu(false);
    }
  };

  // Insert mention into text
  const insertMention = (member: { email: string; name: string }) => {
    const lastAtIndex = newComment.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = newComment.slice(0, lastAtIndex);
      const firstName = member.name.split(' ')[0];
      setNewComment(`${beforeAt}@${firstName} `);
    }
    setShowMentionMenu(false);
    textFieldRef.current?.focus();
  };

  // Handle new comment submission
  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUserEmail || !book) return;
    
    setSubmitting(true);
    try {
      const mentions = parseMentions(newComment, members);
      
      const response = await fetch('/api/book-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookIdentifier,
          bookTitle: book.title,
          bookAuthor: book.author,
          authorEmail: currentUserEmail,
          content: newComment,
          parentId: replyingTo,
          mentions,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Add new comment to state
      if (replyingTo) {
        // Add as reply
        setComments(prev => prev.map(c => {
          if (c.id === replyingTo) {
            return { ...c, replies: [...(c.replies || []), data.comment] };
          }
          return c;
        }));
      } else {
        // Add as top-level comment
        setComments(prev => [...prev, { ...data.comment, replies: [] }]);
      }

      setNewComment('');
      setReplyingTo(null);
      
      // Scroll to the new comment
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = async (commentId: string, newContent: string) => {
    try {
      const response = await fetch('/api/book-comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          authorEmail: currentUserEmail,
          content: newContent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      // Update in state
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, content: newContent, updated_at: new Date().toISOString() };
        }
        // Check replies
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map(r => 
              r.id === commentId 
                ? { ...r, content: newContent, updated_at: new Date().toISOString() }
                : r
            ),
          };
        }
        return c;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit comment');
    }
  };

  // Handle delete
  const handleDelete = async (commentId: string) => {
    try {
      const response = await fetch(
        `/api/book-comments?commentId=${commentId}&authorEmail=${encodeURIComponent(currentUserEmail!)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      // Remove from state
      setComments(prev => {
        // Check if it's a top-level comment
        const isTopLevel = prev.some(c => c.id === commentId);
        if (isTopLevel) {
          return prev.filter(c => c.id !== commentId);
        }
        // Check replies
        return prev.map(c => ({
          ...c,
          replies: c.replies?.filter(r => r.id !== commentId) || [],
        }));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  // Handle reaction
  const handleReaction = async (commentId: string, emoji: string, hasReacted: boolean) => {
    if (!currentUserEmail) return;

    try {
      if (hasReacted) {
        // Remove reaction
        await fetch(
          `/api/book-comments/reactions?commentId=${commentId}&userEmail=${encodeURIComponent(currentUserEmail)}&emoji=${encodeURIComponent(emoji)}`,
          { method: 'DELETE' }
        );
      } else {
        // Add reaction
        await fetch('/api/book-comments/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId, userEmail: currentUserEmail, emoji }),
        });
      }

      // Update state optimistically
      setComments(prev => prev.map(c => {
        const updateReactions = (comment: BookComment): BookComment => {
          if (comment.id === commentId) {
            let reactions = [...(comment.reactions || [])];
            const existingIdx = reactions.findIndex(r => r.emoji === emoji);
            
            if (hasReacted) {
              // Remove user from reaction
              if (existingIdx >= 0) {
                reactions[existingIdx] = {
                  ...reactions[existingIdx],
                  count: reactions[existingIdx].count - 1,
                  users: reactions[existingIdx].users.filter(u => u !== currentUserEmail),
                };
                if (reactions[existingIdx].count === 0) {
                  reactions = reactions.filter(r => r.emoji !== emoji);
                }
              }
            } else {
              // Add user to reaction
              if (existingIdx >= 0) {
                reactions[existingIdx] = {
                  ...reactions[existingIdx],
                  count: reactions[existingIdx].count + 1,
                  users: [...reactions[existingIdx].users, currentUserEmail],
                };
              } else {
                reactions.push({ emoji, count: 1, users: [currentUserEmail] });
              }
            }
            
            return { ...comment, reactions };
          }
          return comment;
        };

        const updated = updateReactions(c);
        if (c.replies) {
          return {
            ...updated,
            replies: c.replies.map(r => updateReactions(r)),
          };
        }
        return updated;
      }));
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  if (!book) return null;

  const largeCoverUrl = book.coverUrl?.replace("-M.jpg", "-L.jpg") || book.coverUrl;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          height: { xs: '90vh', md: '80vh' },
          maxHeight: { xs: '90vh', md: '80vh' },
        },
      }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header with book info */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          {/* Cover Image */}
          <Box sx={{ flexShrink: 0 }}>
            {largeCoverUrl ? (
              <Avatar
                src={largeCoverUrl}
                alt={`Cover of ${book.title}`}
                variant="rounded"
                sx={{
                  width: 60,
                  height: 90,
                  boxShadow: 2,
                  '& img': { objectFit: 'cover' },
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 60,
                  height: 90,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MenuBook sx={{ fontSize: 30, color: 'text.disabled' }} />
              </Box>
            )}
          </Box>

          {/* Book details */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
              {book.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              by {book.author || 'Unknown Author'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <ChatBubbleOutline fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </Typography>
              {readOnly && (
                <Chip label="Read Only" size="small" variant="outlined" sx={{ ml: 1 }} />
              )}
            </Box>
          </Box>

          {/* Close button */}
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Comments area */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            bgcolor: 'background.default',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="error">{error}</Typography>
              <Button onClick={fetchComments} sx={{ mt: 1 }}>
                Try Again
              </Button>
            </Box>
          ) : comments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ChatBubbleOutline sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                No comments yet. {!readOnly && 'Be the first to share your thoughts!'}
              </Typography>
            </Box>
          ) : (
            <>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserEmail={currentUserEmail}
                  profiles={profiles}
                  members={members}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReply={setReplyingTo}
                  onReaction={handleReaction}
                  readOnly={readOnly}
                />
              ))}
              <div ref={commentsEndRef} />
            </>
          )}
        </Box>

        {/* New comment input */}
        {currentUserEmail && !readOnly ? (
          <Paper sx={{ p: 2, borderTop: 1, borderColor: 'divider' }} elevation={0}>
            {replyingTo && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Replying to comment
                </Typography>
                <IconButton size="small" onClick={() => setReplyingTo(null)}>
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder={replyingTo ? 'Write a reply... (use @ to mention someone)' : 'Share your thoughts on this book... (use @ to mention someone)'}
                value={newComment}
                onChange={handleInputChange}
                inputRef={textFieldRef}
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting || !newComment.trim()}
                sx={{ alignSelf: 'flex-end' }}
              >
                {submitting ? <CircularProgress size={20} /> : <Send />}
              </Button>
            </Box>

            {/* Mention dropdown */}
            <Popover
              open={showMentionMenu && filteredMembers.length > 0}
              anchorEl={mentionAnchor}
              onClose={() => setShowMentionMenu(false)}
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              disableAutoFocus
              disableEnforceFocus
            >
              <Box sx={{ py: 1 }}>
                {filteredMembers.map((member) => (
                  <MenuItem
                    key={member.email}
                    onClick={() => insertMention(member)}
                    sx={{ display: 'flex', gap: 1 }}
                  >
                    <MemberAvatar
                      name={member.name}
                      email={member.email}
                      profiles={profiles}
                      size="small"
                    />
                    <Typography variant="body2">{member.name}</Typography>
                  </MenuItem>
                ))}
              </Box>
            </Popover>
          </Paper>
        ) : !currentUserEmail && !readOnly ? (
          <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
            <Typography variant="body2" color="text.secondary">
              Sign in to join the conversation
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
