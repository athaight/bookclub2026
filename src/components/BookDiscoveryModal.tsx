'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Paper,
  Divider,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  AutoStories,
  Psychology,
  Close,
  ExpandMore,
  ExpandLess,
  Add,
  CheckCircle,
} from '@mui/icons-material';

interface BookDiscoveryModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
  onWishlistUpdated?: () => void;
}

interface BookRecommendation {
  title: string;
  author: string;
  genre?: string;
  coverUrl?: string;
  isbn?: string;
  summary?: string;
  why: string;
  readBy?: string[];
}

type Step = 'preferences' | 'mode-select' | 'loading' | 'chat' | 'results';

export default function BookDiscoveryModal({
    open,
    onClose,
    userEmail,
    onWishlistUpdated,
  }: BookDiscoveryModalProps) {
  // State management
  const [step, setStep] = useState<Step>('preferences');
  const [includeAllBros, setIncludeAllBros] = useState(false);
  const [rememberPreferences, setRememberPreferences] = useState(true);
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userResponse, setUserResponse] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [savedBooks, setSavedBooks] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Reset modal state
  const handleClose = () => {
    setStep('preferences');
    setRecommendations([]);
    setConversationHistory([]);
    setCurrentQuestion('');
    setUserResponse('');
    setError('');
    setSavedBooks(new Set());
    setExpandedCards(new Set());
    onClose();
  };

  // Handle "Choose For Me" (instant mode)
  const handleChooseForMe = async () => {
    setStep('loading');
    setError('');

    try {
      const response = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          userEmail,
          mode: 'instant',
          includeAllBros,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recommendations');
      }

      setRecommendations(data.recommendations || []);
      setConversationId(data.conversationId);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('mode-select');
    }
  };

  // Handle "Help Me Choose" (conversational mode)
  const handleHelpMeChoose = async () => {
    setStep('loading');
    setError('');

    try {
      const response = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          userEmail,
          mode: 'conversational',
          includeAllBros,
          conversationHistory: [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start conversation');
      }

      if (data.needsMoreInfo && data.question) {
        setCurrentQuestion(data.question);
        setConversationId(data.conversationId);
        setConversationHistory([{ role: 'assistant', content: data.question }]);
        setStep('chat');
      } else {
        // Got recommendations immediately
        setRecommendations(data.recommendations || []);
        setConversationId(data.conversationId);
        setStep('results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('mode-select');
    }
  };

  // Handle user's chat response
  const handleChatSubmit = async () => {
    if (!userResponse.trim()) return;

    const newHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: userResponse },
    ];
    setConversationHistory(newHistory);
    setUserResponse('');
    setStep('loading');

    try {
      const response = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          userEmail,
          mode: 'conversational',
          includeAllBros,
          conversationHistory: newHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to continue conversation');
      }

      if (data.needsMoreInfo && data.question) {
        // Another question
        setCurrentQuestion(data.question);
        setConversationHistory([
          ...newHistory,
          { role: 'assistant', content: data.question },
        ]);
        setStep('chat');
      } else {
        // Final recommendations
        setRecommendations(data.recommendations || []);
        setStep('results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('chat');
    }
  };

  // Save book to wishlist
  const handleSaveToWishlist = async (book: BookRecommendation) => {
    try {
      const response = await fetch('/api/wishlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          bookData: {
            title: book.title,
            author: book.author,
            coverUrl: book.coverUrl,
            genre: book.genre,
            isbn: book.isbn,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSavedBooks(new Set([...savedBooks, `${book.title}|${book.author}`]));
        if (typeof onWishlistUpdated === 'function') {
          onWishlistUpdated();
        }
      } else {
        setError(data.message || 'Failed to save to wishlist');
      }
    } catch (err) {
      setError('Failed to save to wishlist');
    }
  };

  // Toggle card expansion
  const toggleCardExpansion = (bookKey: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(bookKey)) {
      newExpanded.delete(bookKey);
    } else {
      newExpanded.add(bookKey);
    }
    setExpandedCards(newExpanded);
  };

  // Render different steps
  const renderContent = () => {
    switch (step) {
      case 'preferences':
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Let AI discover your next great read based on your Book Bros library!
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeAllBros}
                    onChange={(e) => setIncludeAllBros(e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Include All Book Bros Readings
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Get suggestions based on what all members have read
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={rememberPreferences}
                    onChange={(e) => setRememberPreferences(e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Remember My Preferences
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Save these settings for next time
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<AutoStories />}
                onClick={() => setStep('mode-select')}
              >
                Continue
              </Button>
            </Box>
          </Box>
        );

      case 'mode-select':
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 4, textAlign: 'center' }}>
              How would you like to discover your next book?
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Card
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                }}
                onClick={handleChooseForMe}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <AutoStories sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Choose For Me
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Get instant recommendations based on your reading profile
                  </Typography>
                </CardContent>
              </Card>

              <Card
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                }}
                onClick={handleHelpMeChoose}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Psychology sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Help Me Choose
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Answer a few questions for more personalized suggestions
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      case 'loading':
        return (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Finding Your Perfect Books...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This may take a moment while we analyze your reading profile
            </Typography>
          </Box>
        );

      case 'chat':
        return (
          <Box>
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
              <Typography variant="body1">{currentQuestion}</Typography>
            </Paper>

            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Type your answer here..."
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSubmit();
                }
              }}
            />

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleChatSubmit}
                disabled={!userResponse.trim()}
              >
                Send
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      case 'results':
        return (
          <Box>
            {recommendations.length === 0 ? (
              <Alert severity="info">
                No recommendations found. Try adjusting your preferences!
              </Alert>
            ) : (
              <>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Here are {recommendations.length} books we think you'll love:
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recommendations.map((book) => {
                    const bookKey = `${book.title}|${book.author}`;
                    const isSaved = savedBooks.has(bookKey);
                    const isExpanded = expandedCards.has(bookKey);

                    return (
                      <Card key={bookKey} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                        {book.coverUrl && (
  <CardMedia
    component="img"
    sx={{ 
      width: { xs: '100%', sm: 120 }, 
      height: { xs: 180, sm: 180 },
      objectFit: 'contain',
      bgcolor: 'grey.100',
      flexShrink: 0,
    }}
    image={book.coverUrl}
    alt={book.title}
  />
)}
                        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {book.title}
                            </Typography>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              by {book.author}
                            </Typography>

                            {book.genre && (
                              <Chip label={book.genre} size="small" sx={{ mt: 1 }} />
                            )}

                            {book.readBy && book.readBy.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="primary">
                                  📚 Read by: {book.readBy.join(', ')}
                                </Typography>
                              </Box>
                            )}

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Why this matches you:</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {book.why}
                            </Typography>

                            {book.summary && (
                              <>
                                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                                  <Button
                                    size="small"
                                    onClick={() => toggleCardExpansion(bookKey)}
                                    endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                                  >
                                    {isExpanded ? 'Hide' : 'Show'} Summary
                                  </Button>
                                </Box>
                                <Collapse in={isExpanded}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                    {book.summary.slice(0, 300)}
                                    {book.summary.length > 300 && '...'}
                                  </Typography>
                                </Collapse>
                              </>
                            )}
                          </CardContent>

                          <CardActions sx={{ justifyContent: 'flex-end' }}>
                            <Button
                              variant={isSaved ? 'outlined' : 'contained'}
                              size="small"
                              startIcon={isSaved ? <CheckCircle /> : <Add />}
                              onClick={() => !isSaved && handleSaveToWishlist(book)}
                              disabled={isSaved}
                            >
                              {isSaved ? 'Added to Wishlist' : 'Save to Wishlist'}
                            </Button>
                          </CardActions>
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              </>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoStories color="primary" />
          <Typography variant="h6">Book Discovery</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>{renderContent()}</DialogContent>

      {step !== 'loading' && step !== 'results' && (
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      )}

      {step === 'results' && (
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}