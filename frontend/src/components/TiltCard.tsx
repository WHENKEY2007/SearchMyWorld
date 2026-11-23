import React, { useRef } from 'react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees (default: 6)
  glareEffect?: boolean;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 6,
  glareEffect = true,
  onMouseMove,
  onMouseLeave,
  onMouseEnter,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    // Apply 3D perspective tilt directly on GPU (no React state lag)
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px) scale3d(1.015, 1.015, 1.015)`;

    if (glareRef.current && glareEffect) {
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      glareRef.current.style.opacity = '1';
      glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 60%)`;
    }

    if (onMouseMove) onMouseMove(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 120ms ease-out';
    }
    if (onMouseEnter) onMouseEnter(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      // Smooth spring reset when cursor leaves
      cardRef.current.style.transition = 'transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)';
    }
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
    if (onMouseLeave) onMouseLeave(e);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {children}
      {glareEffect && (
        <div
          ref={glareRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 z-10"
        />
      )}
    </div>
  );
};
