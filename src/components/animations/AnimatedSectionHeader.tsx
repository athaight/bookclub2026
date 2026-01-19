'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Typography, Box, type SxProps, type Theme } from '@mui/material';
import { forwardRef } from 'react';
import {
  fadeUp,
  fadeIn,
  slideInLeft,
  slideInRight,
  scaleUp,
  staggerContainer,
  timing,
  easing,
  viewportOnce,
} from './variants';

// ============================================
// TYPES
// ============================================

type AnimationStyle =
  | 'fadeUp'
  | 'fadeIn'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleUp'
  | 'lineAccent'
  | 'bracketReveal'
  | 'counterReveal';

interface AnimatedSectionHeaderProps {
  /** The header text */
  children: string;
  /** Optional subtitle below the header */
  subtitle?: string;
  /** Animation style preset */
  animation?: AnimationStyle;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Accent color for decorative elements */
  accentColor?: string;
  /** Section number for counterReveal style */
  sectionNumber?: number;
  /** Trigger repeatedly or only once */
  triggerOnce?: boolean;
  /** MUI Typography variant */
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Container styles */
  containerSx?: SxProps<Theme>;
  /** Typography styles */
  sx?: SxProps<Theme>;
  /** Additional class name */
  className?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Font weight override */
  fontWeight?: number | string;
}

// ============================================
// CUSTOM VARIANTS
// ============================================

const lineAccentVariant: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: {
    scaleX: 1,
    transition: {
      duration: timing.slow,
      ease: easing.out,
    },
  },
};

const bracketVariant = (side: 'left' | 'right'): Variants => ({
  hidden: {
    opacity: 0,
    x: side === 'left' ? -20 : 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: timing.normal,
      ease: easing.bounce,
    },
  },
});

const counterVariant: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    rotate: -10,
  },
  visible: {
    opacity: 0.15,
    scale: 1,
    rotate: 0,
    transition: {
      duration: timing.slow,
      ease: easing.out,
    },
  },
};

// Variant getter
const getVariants = (animation: AnimationStyle): Variants => {
  switch (animation) {
    case 'fadeIn':
      return fadeIn;
    case 'slideLeft':
      return slideInLeft;
    case 'slideRight':
      return slideInRight;
    case 'scaleUp':
      return scaleUp;
    case 'lineAccent':
    case 'bracketReveal':
    case 'counterReveal':
      return staggerContainer;
    case 'fadeUp':
    default:
      return fadeUp;
  }
};

// ============================================
// COMPONENT
// ============================================

export const AnimatedSectionHeader = forwardRef<HTMLDivElement, AnimatedSectionHeaderProps>(
  function AnimatedSectionHeader(
    {
      children,
      subtitle,
      animation = 'fadeUp',
      delay = 0,
      accentColor,
      sectionNumber,
      triggerOnce = true,
      variant = 'h2',
      containerSx,
      sx,
      className,
      align,
      fontWeight,
    },
    ref
  ) {
    const prefersReducedMotion = useReducedMotion();

    const viewport = { ...viewportOnce, once: triggerOnce };

    // Skip animations for reduced motion preference
    if (prefersReducedMotion) {
      return (
        <Box ref={ref} sx={containerSx} className={className}>
          <Typography variant={variant} sx={{ ...sx, fontWeight, textAlign: align }}>
            {children}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      );
    }

    // ========================================
    // LINE ACCENT (horizontal line that wipes in)
    // ========================================
    if (animation === 'lineAccent') {
      return (
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className={className}
        >
          <Box sx={containerSx}>
            <motion.span
              variants={lineAccentVariant}
              style={{
                display: 'block',
                width: '60px',
                height: '3px',
                backgroundColor: accentColor || 'currentColor',
                marginBottom: '12px',
                borderRadius: '2px',
              }}
            />
            <motion.div variants={fadeUp}>
              <Typography variant={variant} sx={{ ...sx, fontWeight, textAlign: align }}>
                {children}
              </Typography>
            </motion.div>
            {subtitle && (
              <motion.div variants={fadeUp}>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  {subtitle}
                </Typography>
              </motion.div>
            )}
          </Box>
        </motion.div>
      );
    }

    // ========================================
    // BRACKET REVEAL (decorative brackets animate in)
    // ========================================
    if (animation === 'bracketReveal') {
      return (
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className={className}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              ...containerSx,
            }}
          >
            <motion.span
              variants={bracketVariant('left')}
              style={{
                fontSize: '1.5em',
                fontWeight: 300,
                color: accentColor || 'currentColor',
                opacity: 0.6,
              }}
            >
              [
            </motion.span>
            <Box>
              <motion.div variants={fadeIn}>
                <Typography variant={variant} sx={{ ...sx, fontWeight, textAlign: align }}>
                  {children}
                </Typography>
              </motion.div>
              {subtitle && (
                <motion.div variants={fadeIn}>
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                </motion.div>
              )}
            </Box>
            <motion.span
              variants={bracketVariant('right')}
              style={{
                fontSize: '1.5em',
                fontWeight: 300,
                color: accentColor || 'currentColor',
                opacity: 0.6,
              }}
            >
              ]
            </motion.span>
          </Box>
        </motion.div>
      );
    }

    // ========================================
    // COUNTER REVEAL (large number behind text)
    // ========================================
    if (animation === 'counterReveal') {
      const displayNumber = sectionNumber?.toString().padStart(2, '0') || '01';
      return (
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className={className}
        >
          <Box
            sx={{
              position: 'relative',
              ...containerSx,
            }}
          >
            <motion.span
              variants={counterVariant}
              style={{
                position: 'absolute',
                top: '-0.3em',
                left: '-0.1em',
                fontSize: '4em',
                fontWeight: 900,
                color: accentColor || 'currentColor',
                lineHeight: 1,
                userSelect: 'none',
                pointerEvents: 'none',
                fontFamily: 'inherit',
              }}
            >
              {displayNumber}
            </motion.span>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <motion.div variants={fadeUp}>
                <Typography variant={variant} sx={{ ...sx, fontWeight, textAlign: align }}>
                  {children}
                </Typography>
              </motion.div>
              {subtitle && (
                <motion.div variants={fadeUp}>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                    {subtitle}
                  </Typography>
                </motion.div>
              )}
            </Box>
          </Box>
        </motion.div>
      );
    }

    // ========================================
    // SIMPLE VARIANTS
    // ========================================
    return (
      <motion.div
        ref={ref}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        transition={{ delayChildren: delay }}
        className={className}
      >
        <Box sx={containerSx}>
          <motion.div variants={getVariants(animation)}>
            <Typography variant={variant} sx={{ ...sx, fontWeight, textAlign: align }}>
              {children}
            </Typography>
          </motion.div>
          {subtitle && (
            <motion.div variants={fadeUp}>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            </motion.div>
          )}
        </Box>
      </motion.div>
    );
  }
);

export default AnimatedSectionHeader;
