import React, { useEffect, useRef } from 'react';

export const CursorEffect: React.FC = () => {
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only enable on desktop with fine mouse pointer
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let glowX = -100;
    let glowY = -100;

    let isHovering = false;
    let isClicking = false;
    let isVisible = false;
    let animationFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        isVisible = true;
        if (ringRef.current) ringRef.current.style.opacity = '1';
        if (glowRef.current) glowRef.current.style.opacity = '1';
      }

      // Check if hovering interactive target
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('button, a, input, select, textarea, [role="button"], .cursor-pointer');
        isHovering = !!interactive;
      }
    };

    const onMouseDown = () => {
      isClicking = true;
    };

    const onMouseUp = () => {
      isClicking = false;
    };

    const onMouseLeave = () => {
      isVisible = false;
      if (ringRef.current) ringRef.current.style.opacity = '0';
      if (glowRef.current) glowRef.current.style.opacity = '0';
    };

    // 60-120fps direct hardware-accelerated lerp loop (Zero React re-renders)
    const animate = () => {
      // Smooth linear interpolation (lerp)
      const ringLerp = isHovering ? 0.22 : 0.16;
      ringX += (mouseX - ringX) * ringLerp;
      ringY += (mouseY - ringY) * ringLerp;

      // Slower, softer lerp for background ambient glow
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;

      if (ringRef.current) {
        const scale = isClicking ? 0.85 : isHovering ? 1.6 : 1.0;
        ringRef.current.style.transform = `translate3d(${ringX - 16}px, ${ringY - 16}px, 0) scale(${scale})`;
        
        if (isHovering) {
          ringRef.current.classList.add('border-purple-500', 'bg-purple-500/10', 'dark:border-purple-400', 'dark:bg-purple-400/15');
          ringRef.current.classList.remove('border-slate-400/40', 'dark:border-white/30');
        } else {
          ringRef.current.classList.remove('border-purple-500', 'bg-purple-500/10', 'dark:border-purple-400', 'dark:bg-purple-400/15');
          ringRef.current.classList.add('border-slate-400/40', 'dark:border-white/30');
        }
      }

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${glowX - 200}px, ${glowY - 200}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* 1. Ambient Background Spotlight Glow (subtle & beautiful depth) */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="fixed top-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none z-0 blur-[90px] opacity-0 transition-opacity duration-500 will-change-transform bg-gradient-to-r from-purple-400/10 via-indigo-400/10 to-amber-300/10 dark:from-purple-600/15 dark:via-blue-600/10 dark:to-teal-500/10"
      />

      {/* 2. Sleek Trailing Follower Ring */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-slate-400/40 dark:border-white/30 pointer-events-none z-50 opacity-0 transition-opacity duration-300 will-change-transform backdrop-blur-[1px]"
      />
    </>
  );
};
