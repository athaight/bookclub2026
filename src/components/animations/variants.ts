import type { Variants } from 'framer-motion';

// ============================================
// TIMING CONSTANTS
// ============================================

export const timing = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  verySlow: 0.8,
} as const;

// ============================================
// EASING PRESETS
// ============================================

export const easing = {
  // Standard easings
  out: [0.16, 1, 0.3, 1] as const,
  in: [0.4, 0, 1, 1] as const,
  inOut: [0.4, 0, 0.2, 1] as const,
  // Bounce/spring-like
  bounce: [0.34, 1.56, 0.64, 1] as const,
  // Smooth deceleration
  smooth: [0.25, 0.1, 0.25, 1] as const,
} as const;

// ============================================
// VIEWPORT CONFIG
// ============================================

export const viewportOnce = {
  once: true,
  amount: 0.3,
} as const;

// ============================================
// BASIC FADE VARIANTS
// ============================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: timing.normal,
      ease: easing.out,
    },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: timing.normal,
      ease: easing.out,
    },
  },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: timing.normal,
      ease: easing.out,
    },
  },
};

// ============================================
// SLIDE VARIANTS
// ============================================

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: timing.normal,
      ease: easing.out,
    },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: timing.normal,
      ease: easing.out,
    },
  },
};

// ============================================
// SCALE VARIANTS
// ============================================

export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: timing.normal,
      ease: easing.bounce,
    },
  },
};

export const scaleDown: Variants = {
  hidden: { opacity: 0, scale: 1.1 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: timing.normal,
      ease: easing.out,
    },
  },
};

// ============================================
// STAGGER CONTAINERS
// ============================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

// ============================================
// TEXT ANIMATION VARIANTS
// ============================================

export const letterReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: timing.fast,
      ease: easing.out,
    },
  },
};

export const wordReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    rotateX: -90,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: timing.normal,
      ease: easing.out,
    },
  },
};

export const underlineWipe: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: {
    scaleX: 1,
    transition: {
      duration: timing.slow,
      ease: easing.out,
      delay: 0.2,
    },
  },
};

// ============================================
// LIST/ITEM VARIANTS
// ============================================

export const listContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: timing.fast,
      ease: easing.out,
    },
  },
};

// ============================================
// CARD VARIANTS
// ============================================

export const cardHover: Variants = {
  rest: {
    scale: 1,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    transition: {
      duration: timing.fast,
      ease: easing.out,
    },
  },
};

// ============================================
// NAV VARIANTS
// ============================================

export const navItem: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: timing.fast,
      ease: easing.out,
    },
  },
};

export const mobileMenu: Variants = {
  closed: {
    opacity: 0,
    height: 0,
    transition: {
      duration: timing.normal,
      ease: easing.inOut,
    },
  },
  open: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: timing.normal,
      ease: easing.inOut,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};
