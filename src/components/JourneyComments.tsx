'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  Divider,
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
} from '@mui/icons-material';
import MemberAvatar from './MemberAvatar';
import { ProfileRow } from '@/types';

// Types
export interface JourneyComment {
  id: string;
  book_of_month_id: string;
  author_email: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
  reactions?: ReactionGroup[];
  replies?: JourneyComment[];
  mentions?: string[];
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
}

interface JourneyCommentsProps {
  bookOfMonthId: string;
  currentUserEmail: string | null;
  profiles: Record<string, ProfileRow>;
  members: { email: string; name: string }[];
}

// Common emoji reactions
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🎉', '🤔', '📚', '🔥', '👏'];

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
  comment: JourneyComment;
  currentUserEmail: string | null;
  profiles: Record<string, ProfileRow>;
  members: { email: string; name: string }[];
  onEdit: (commentId: string, newContent: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (parentId: string) => void;
  onReaction: (commentId: string, emoji: string, hasReacted: boolean) => Promise<void>;
  isReply?: boolean;
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
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<null | HTMLElement>(null);
  const [saving, setSaving] = useState(false);

  const isOwner = currentUserEmail === comment.author_email;
  const isLoggedIn = !!currentUserEmail;

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
                minRows={2}
                maxRows={12}
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
        {isOwner && !isEditing && (
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
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}

// Main Component
export default function JourneyComments({
  bookOfMonthId,
  currentUserEmail,
  profiles,
  members,
}: JourneyCommentsProps) {
  const [comments, setComments] = useState<JourneyComment[]>([]);
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
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of comments
  const scrollToBottom = useCallback(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/journey-comments?bookOfMonthId=${bookOfMonthId}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [bookOfMonthId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Handle new comment submission
  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUserEmail) return;
    
    setSubmitting(true);
    try {
      const mentions = parseMentions(newComment, members);
      
      const response = await fetch('/api/journey-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookOfMonthId,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = async (commentId: string, newContent: string) => {
    try {
      const response = await fetch('/api/journey-comments', {
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
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    }
  };

  // Handle delete
  const handleDelete = async (commentId: string) => {
    try {
      const response = await fetch(
        `/api/journey-comments?commentId=${commentId}&authorEmail=${currentUserEmail}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      // Remove from state
      setComments(prev => prev
        .filter(c => c.id !== commentId)
        .map(c => ({
          ...c,
          replies: c.replies?.filter(r => r.id !== commentId) || [],
        }))
      );
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
          `/api/journey-comments/reactions?commentId=${commentId}&userEmail=${currentUserEmail}&emoji=${encodeURIComponent(emoji)}`,
          { method: 'DELETE' }
        );
      } else {
        // Add reaction
        await fetch('/api/journey-comments/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId, userEmail: currentUserEmail, emoji }),
        });
      }

      // Update state
      setComments(prev => prev.map(c => {
        const updateReactions = (comment: JourneyComment): JourneyComment => {
          if (comment.id !== commentId) {
            return {
              ...comment,
              replies: comment.replies?.map(updateReactions),
            };
          }

          const reactions = [...(comment.reactions || [])];
          const existingIdx = reactions.findIndex(r => r.emoji === emoji);

          if (hasReacted) {
            // Remove user from reaction
            if (existingIdx !== -1) {
              reactions[existingIdx] = {
                ...reactions[existingIdx],
                count: reactions[existingIdx].count - 1,
                users: reactions[existingIdx].users.filter(u => u !== currentUserEmail),
              };
              if (reactions[existingIdx].count === 0) {
                reactions.splice(existingIdx, 1);
              }
            }
          } else {
            // Add user to reaction
            if (existingIdx !== -1) {
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
        };

        return updateReactions(c);
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reaction');
    }
  };

  // Handle @ mention typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // Check for @ trigger
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ')) {
      const filterText = textBeforeCursor.slice(lastAtIndex + 1);
      if (!filterText.includes(' ')) {
        setMentionFilter(filterText.toLowerCase());
        setShowMentionMenu(true);
        setMentionAnchor(e.target as HTMLElement);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  // Insert mention
  const insertMention = (member: { email: string; name: string }) => {
    const cursorPos = textFieldRef.current?.selectionStart || 0;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const newText = 
      newComment.slice(0, lastAtIndex) + 
      `@${member.name.split(' ')[0]} ` + 
      newComment.slice(cursorPos);
    
    setNewComment(newText);
    setShowMentionMenu(false);
    textFieldRef.current?.focus();
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(mentionFilter) ||
    m.email.split('@')[0].toLowerCase().includes(mentionFilter)
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Always visible */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        📖 Along the Journey
      </Typography>

      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          {error}
          <IconButton size="small" onClick={() => setError(null)} sx={{ float: 'right' }}>
            <Close fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {/* Scrollable comments area */}
      <Box
        ref={commentsContainerRef}
        sx={{
          // On mobile: no max height, no scroll - let page scroll handle it
          // On desktop: scrollable with max height
          maxHeight: { xs: 'none', md: 1000 },
          minHeight: { xs: 0, md: 150 },
          overflowY: { xs: 'visible', md: 'auto' },
          pr: { xs: 0, md: 1 },
          mb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        {comments.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No comments yet. {currentUserEmail ? 'Be the first to share your thoughts!' : 'Sign in to join the conversation.'}
            </Typography>
          </Paper>
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
              />
            ))}
            {/* Invisible element to scroll to */}
            <div ref={commentsEndRef} />
          </>
        )}
      </Box>

      {/* New comment input - Always visible at bottom */}
      {currentUserEmail ? (
        <Paper sx={{ p: 2 }} elevation={2}>
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
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={12}
              placeholder={replyingTo ? 'Write a reply... (use @ to mention someone)' : 'Share your thoughts on the journey... (use @ to mention someone)'}
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
      ) : null}
    </Box>
  );
}
