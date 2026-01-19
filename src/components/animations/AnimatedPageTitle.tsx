'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Typography, Box, type SxProps, type Theme } from '@mui/material';
import { forwardRef } from 'react';
import {
  fadeUp,
  fadeDown,
  scaleUp,
  slideInLeft,
  staggerContainerFast,
  letterReveal,
  wordReveal,
  underlineWipe,
  timing,
  easing,
} from './variants';

// ============================================
// TYPES
// ============================================

type AnimationStyle =
  | 'fadeUp'
  | 'fadeDown'
  | 'scaleUp'
  | 'slideIn'
  | 'letterByLetter'
  | 'wordByWord'
  | 'underlineReveal'
  | 'splitReveal';

interface AnimatedPageTitleProps {
  /** The title text to animate */
  children: string;
  /** Animation style preset */
  animation?: AnimationStyle;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Custom underline color for underlineReveal style */
  underlineColor?: string;
  /** Whether to trigger on mount or when in viewport */
  triggerOnView?: boolean;
  /** MUI Typography variant */
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Typography styles */
  sx?: SxProps<Theme>;
  /** Additional class name */
  className?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Font weight override */
  fontWeight?: number | string;
  /** Gutter bottom */
  gutterBottom?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const AnimatedPageTitle = forwardRef<HTMLDivElement, AnimatedPageTitleProps>(
  function AnimatedPageTitle(
    {
      children,
      animation = 'fadeUp',
      delay = 0,
      underlineColor,
      triggerOnView = false,
      variant = 'h1',
      sx,
      className,
      align,
      fontWeight,
      gutterBottom,
    },
    ref
  ) {
    const prefersReducedMotion = useReducedMotion();

    // Get the appropriate variant based on animation style
    const getVariants = (): Variants => {
      switch (animation) {
        case 'fadeDown':
          return fadeDown;
        case 'scaleUp':
          return scaleUp;
        case 'slideIn':
          return slideInLeft;
        case 'letterByLetter':
        case 'wordByWord':
        case 'splitReveal':
        case 'underlineReveal':
          return staggerContainerFast;
        case 'fadeUp':
        default:
          return fadeUp;
      }
    };

    // Viewport trigger config
    const viewportConfig = { once: true, amount: 0.5 };

    // Animation trigger props
    const animationProps = triggerOnView
      ? { initial: 'hidden' as const, whileInView: 'visible' as const, viewport: viewportConfig }
      : { initial: 'hidden' as const, animate: 'visible' as const };

    // Skip animations for reduced motion preference
    if (prefersReducedMotion) {
      return (
        <Typography
          variant={variant}
          sx={{ ...sx, fontWeight, textAlign: align }}
          className={className}
          gutterBottom={gutterBottom}
        >
          {children}
        </Typography>
      );
    }

    // ========================================
    // LETTER BY LETTER
    // ========================================
    if (animation === 'letterByLetter') {
      const letters = children.split('');
      return (
        <motion.div
          ref={ref}
          variants={staggerContainerFast}
          {...animationProps}
          transition={{ delayChildren: delay }}
          className={className}
        >
          <Typography
            variant={variant}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              ...sx,
              fontWeight,
              textAlign: align,
            }}
            gutterBottom={gutterBottom}
            component="div"
          >
            {letters.map((letter, index) => (
              <motion.span
                key={`${letter}-${index}`}
                variants={letterReveal}
                style={{
                  display: 'inline-block',
                  whiteSpace: letter === ' ' ? 'pre' : 'normal',
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </motion.span>
            ))}
          </Typography>
        </motion.div>
      );
    }

    // ========================================
    // WORD BY WORD
    // ========================================
    if (animation === 'wordByWord') {
      const words = children.split(' ');
      return (
        <motion.div
          ref={ref}
          variants={staggerContainerFast}
          {...animationProps}
          transition={{ delayChildren: delay }}
          className={className}
        >
          <Typography
            variant={variant}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.25em',
              perspective: '500px',
              ...sx,
              fontWeight,
              textAlign: align,
            }}
            gutterBottom={gutterBottom}
            component="div"
          >
            {words.map((word, index) => (
              <motion.span
                key={`${word}-${index}`}
                variants={wordReveal}
                style={{
                  display: 'inline-block',
                  transformOrigin: 'bottom',
                }}
              >
                {word}
              </motion.span>
            ))}
          </Typography>
        </motion.div>
      );
    }

    // ========================================
    // SPLIT REVEAL (slide up from below)
    // ========================================
    if (animation === 'splitReveal') {
      return (
        <motion.div
          ref={ref}
          {...animationProps}
          transition={{ delay }}
          style={{
            position: 'relative',
            overflow: 'hidden',
          }}
          className={className}
        >
          <Typography
            variant={variant}
            sx={{
              visibility: 'hidden',
              ...sx,
              fontWeight,
              textAlign: align,
            }}
            gutterBottom={gutterBottom}
          >
            {children}
          </Typography>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{
              duration: timing.slow,
              ease: easing.out,
              delay,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
            }}
          >
            <Typography
              variant={variant}
              sx={{ ...sx, fontWeight, textAlign: align }}
            >
              {children}
            </Typography>
          </motion.div>
        </motion.div>
      );
    }

    // ========================================
    // UNDERLINE REVEAL
    // ========================================
    if (animation === 'underlineReveal') {
      return (
        <motion.div
          ref={ref}
          variants={staggerContainerFast}
          {...animationProps}
          transition={{ delayChildren: delay }}
          style={{ position: 'relative', display: 'inline-block' }}
          className={className}
        >
          <motion.div variants={fadeUp}>
            <Typography
              variant={variant}
              sx={{ ...sx, fontWeight, textAlign: align }}
              gutterBottom={gutterBottom}
            >
              {children}
            </Typography>
          </motion.div>
          <motion.span
            variants={underlineWipe}
            style={{
              position: 'absolute',
              bottom: gutterBottom ? '0.5em' : 0,
              left: 0,
              width: '100%',
              height: '4px',
              backgroundColor: underlineColor || 'currentColor',
              borderRadius: '2px',
            }}
          />
        </motion.div>
      );
    }

    // ========================================
    // SIMPLE VARIANTS (fadeUp, fadeDown, scaleUp, slideIn)
    // ========================================
    return (
      <motion.div
        ref={ref}
        variants={getVariants()}
        {...animationProps}
        transition={{ delay }}
        className={className}
      >
        <Typography
          variant={variant}
          sx={{ ...sx, fontWeight, textAlign: align }}
          gutterBottom={gutterBottom}
        >
          {children}
        </Typography>
      </motion.div>
    );
  }
);

export default AnimatedPageTitle;
