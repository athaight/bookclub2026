"use client";

import { Typography, Box, Button, Card, CardContent, CardMedia } from "@mui/material";
import { motion } from "framer-motion";

export default function DonatePage() {
  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 4, overflow: 'hidden' }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            Help keep the pages turning.
          </Typography>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <Typography variant="h5" component="p" sx={{ mb: 2 }}>
             Good books, good conversations, and shared curiosity. If you'd like to support the club, donations help us keep it going. Give via Cash App using the link below or the QR code.
          </Typography>
        </motion.div>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Card sx={{ maxWidth: 345 }}>
          <CardMedia
            component="img"
            height="300"
            image="/assets/cashApp.png"
            alt="Cash App QR Code"
            sx={{ objectFit: 'contain' }}
          />
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              Donate via Cash App
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scan the QR code or use the link below to donate through Cash App.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              href="https://cash.app/$recursivision"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 2 }}
            >
              Open in Cash App
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ maxWidth: 345 }}>
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              Support Through thriftbooks.com
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Help us build our library collection by purchasing books from thriftbooks.com.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              href="https://www.thriftbooks.com/share/?code=F0O%252fkt9mRLvrrZWQ%252fRQN8Q%253d%253d"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 2 }}
            >
              #ShareBookLove
            </Button>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
