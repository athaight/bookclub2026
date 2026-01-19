'use client';

import { motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent } from 'framer-motion';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  type SxProps,
  type Theme,
} from '@mui/material';
import { forwardRef, useState, type ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

interface AnimatedNavHeaderProps {
  /** Logo or brand element */
  logo?: ReactNode;
  /** Site/app title */
  title?: string;
  /** Navigation items */
  navItems?: ReactNode;
  /** Right-side actions (profile, buttons, etc.) */
  actions?: ReactNode;
  /** Height when expanded (at top of page) */
  expandedHeight?: number;
  /** Height when collapsed (after scrolling) */
  collapsedHeight?: number;
  /** Scroll distance to fully collapse (px) */
  scrollThreshold?: number;
  /** Background when expanded */
  expandedBg?: string;
  /** Background when collapsed */
  collapsedBg?: string;
  /** Show shadow when collapsed */
  collapsedShadow?: boolean;
  /** Additional styles for the toolbar */
  toolbarSx?: SxProps<Theme>;
  /** Blur effect on collapse */
  blurOnCollapse?: boolean;
  /** AppBar position */
  position?: 'fixed' | 'absolute' | 'sticky' | 'static' | 'relative';
  /** Additional styles */
  sx?: SxProps<Theme>;
  /** Additional class name */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const AnimatedNavHeader = forwardRef<HTMLDivElement, AnimatedNavHeaderProps>(
  function AnimatedNavHeader(
    {
      logo,
      title,
      navItems,
      actions,
      expandedHeight = 80,
      collapsedHeight = 56,
      scrollThreshold = 100,
      expandedBg = 'transparent',
      collapsedBg = 'rgba(255, 255, 255, 0.95)',
      collapsedShadow = true,
      toolbarSx,
      blurOnCollapse = true,
      position = 'sticky',
      sx,
      className,
    },
    ref
  ) {
    const prefersReducedMotion = useReducedMotion();
    const { scrollY } = useScroll();
    
    // Use state for values that need to be applied to MUI components
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Listen to scroll changes
    useMotionValueEvent(scrollY, 'change', (latest) => {
      setIsCollapsed(latest > scrollThreshold * 0.5);
    });

    // Calculate current values based on scroll
    const currentHeight = isCollapsed ? collapsedHeight : expandedHeight;
    const currentBg = isCollapsed ? collapsedBg : expandedBg;
    const currentShadow = isCollapsed && collapsedShadow ? '0 2px 20px rgba(0,0,0,0.1)' : 'none';
    const currentBlur = isCollapsed && blurOnCollapse ? 'blur(10px)' : 'blur(0px)';
    const currentScale = isCollapsed ? 0.85 : 1;
    const currentFontSize = isCollapsed ? '1.2rem' : '1.5rem';

    // Reduced motion: static header without transitions
    if (prefersReducedMotion) {
      return (
        <AppBar
          ref={ref}
          position={position}
          elevation={0}
          sx={{
            backgroundColor: collapsedBg,
            boxShadow: collapsedShadow ? '0 2px 20px rgba(0,0,0,0.1)' : 'none',
            ...sx,
          }}
          className={className}
        >
          <Container maxWidth="lg">
            <Toolbar
              sx={{
                height: collapsedHeight,
                minHeight: collapsedHeight,
                px: { xs: 1, sm: 2 },
                ...toolbarSx,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                {logo}
                {title && (
                  <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                    {title}
                  </Typography>
                )}
              </Box>
              {navItems && (
                <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                  {navItems}
                </Box>
              )}
              {actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
            </Toolbar>
          </Container>
        </AppBar>
      );
    }

    return (
      <AppBar
        ref={ref}
        position={position}
        elevation={0}
        sx={{
          backgroundColor: currentBg,
          boxShadow: currentShadow,
          backdropFilter: currentBlur,
          WebkitBackdropFilter: currentBlur,
          transition: 'all 0.3s ease-out',
          ...sx,
        }}
        className={className}
      >
        <Container maxWidth="lg">
          <Toolbar
            sx={{
              height: currentHeight,
              minHeight: currentHeight,
              px: { xs: 1, sm: 2 },
              transition: 'all 0.3s ease-out',
              ...toolbarSx,
            }}
          >
            {/* Logo & Title */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexGrow: 1,
                transform: `scale(${currentScale})`,
                transformOrigin: 'left center',
                transition: 'transform 0.3s ease-out',
              }}
            >
              {logo}
              {title && (
                <Typography
                  variant="h6"
                  component="span"
                  sx={{
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    fontSize: currentFontSize,
                    transition: 'font-size 0.3s ease-out',
                  }}
                >
                  {title}
                </Typography>
              )}
            </Box>

            {/* Nav Items - hidden on mobile */}
            {navItems && (
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {navItems}
              </Box>
            )}

            {/* Actions */}
            {actions && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {actions}
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>
    );
  }
);

export default AnimatedNavHeader;
