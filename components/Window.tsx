'use client';

import { useEffect, useRef, useState } from 'react';
import { Minus, X } from 'lucide-react';

type ResizeDirection =
  | 'right'
  | 'left'
  | 'bottom'
  | 'top'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

interface WindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  titleActions?: React.ReactNode;
  fullscreen?: boolean;
  wide?: boolean;
  financeDashboard?: boolean;
  compactHeader?: boolean;
  initialWidth?: number;
  initialHeight?: number;
  zIndex?: number;
  onFocus?: () => void;
  onMinimize?: () => void;
}

export default function Window({
  title,
  onClose,
  children,
  titleActions,
  fullscreen = false,
  wide = false,
  financeDashboard = false,
  compactHeader = false,
  initialWidth,
  initialHeight,
  zIndex,
  onFocus,
  onMinimize,
}: WindowProps) {
  const isAutoClubRhodesReservations = title.includes('AUTOCLUB-RHODES');
  const [isMaximized, setIsMaximized] = useState(fullscreen);
  const [isMobileWindow, setIsMobileWindow] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const [windowSize, setWindowSize] = useState({
    width: initialWidth || 1450,
    height: initialHeight || 910,
  });
  const [position, setPosition] = useState({
    x: 48 + Math.round(Math.random() * 24),
    y: 136 + Math.round(Math.random() * 24),
  });
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
    x: number;
    y: number;
    direction: ResizeDirection;
  } | null>(null);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    setIsMaximized(fullscreen);
  }, [fullscreen]);

  useEffect(() => {
    if (!isAutoClubRhodesReservations || isMobileWindow || fullscreen) return;

    const sidebarWidth = 0;
    const availableWidth = Math.max(620, window.innerWidth - sidebarWidth - 32);
    const availableHeight = Math.max(420, window.innerHeight - 84);
    const nextWidth = Math.min(1600, availableWidth);
    const nextHeight = Math.min(940, availableHeight);

    setWindowSize({ width: nextWidth, height: nextHeight });
    setPosition({
      x: sidebarWidth + Math.max(16, Math.round((availableWidth - nextWidth) / 2)),
      y: 60 + Math.max(12, Math.round((availableHeight - nextHeight) / 2)),
    });
  }, [fullscreen, isAutoClubRhodesReservations, isMobileWindow]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateMobileWindow = () => setIsMobileWindow(mediaQuery.matches);

    updateMobileWindow();
    mediaQuery.addEventListener('change', updateMobileWindow);
    window.addEventListener('orientationchange', updateMobileWindow);

    return () => {
      mediaQuery.removeEventListener('change', updateMobileWindow);
      window.removeEventListener('orientationchange', updateMobileWindow);
    };
  }, []);

  const clampPosition = (x: number, y: number) => {
    return {
      x: Math.min(Math.max(x, 16), window.innerWidth - 120),
      y: Math.min(Math.max(y, 72), window.innerHeight - 80),
    };
  };

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-resize-handle="true"]')) return;
    if (isMobileWindow) return;
    if (isMaximized) return;

    event.preventDefault();
    onFocus?.();
    dragStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      x: position.x,
      y: position.y,
    };
  };

  const startResize = (direction: ResizeDirection) => (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onFocus?.();
    resizeStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      width: windowSize.width,
      height: windowSize.height,
      x: position.x,
      y: position.y,
      direction,
    };
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeStartRef.current) return;

      const minWidth = 620;
      const minHeight = 420;
      const maxRight = window.innerWidth - 20;
      const maxBottom = window.innerHeight - 20;
      const deltaX = event.clientX - resizeStartRef.current.mouseX;
      const deltaY = event.clientY - resizeStartRef.current.mouseY;
      const direction = resizeStartRef.current.direction;

      let nextX = resizeStartRef.current.x;
      let nextY = resizeStartRef.current.y;
      let nextWidth = resizeStartRef.current.width;
      let nextHeight = resizeStartRef.current.height;

      if (direction.includes('right')) {
        nextWidth = Math.min(Math.max(resizeStartRef.current.width + deltaX, minWidth), maxRight - resizeStartRef.current.x);
      }

      if (direction.includes('left')) {
        const desiredX = resizeStartRef.current.x + deltaX;
        const maxX = resizeStartRef.current.x + resizeStartRef.current.width - minWidth;
        nextX = Math.min(Math.max(desiredX, 16), maxX);
        nextWidth = resizeStartRef.current.width + resizeStartRef.current.x - nextX;
      }

      if (direction.includes('bottom')) {
        nextHeight = Math.min(Math.max(resizeStartRef.current.height + deltaY, minHeight), maxBottom - resizeStartRef.current.y);
      }

      if (direction.includes('top')) {
        const desiredY = resizeStartRef.current.y + deltaY;
        const maxY = resizeStartRef.current.y + resizeStartRef.current.height - minHeight;
        nextY = Math.min(Math.max(desiredY, 20), maxY);
        nextHeight = resizeStartRef.current.height + resizeStartRef.current.y - nextY;
      }

      setWindowSize({
        width: nextWidth,
        height: nextHeight,
      });
      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      resizeStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStartRef.current) return;

      const nextX = dragStartRef.current.x + event.clientX - dragStartRef.current.mouseX;
      const nextY = dragStartRef.current.y + event.clientY - dragStartRef.current.mouseY;

      setPosition(clampPosition(nextX, nextY));
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [windowSize.width, windowSize.height]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{ zIndex }}
    >
      <div
        onMouseDown={onFocus}
        className={`premium-window-in pointer-events-auto fixed flex flex-col overflow-hidden border border-slate-300 bg-white shadow-[0_26px_82px_rgba(15,23,42,0.2)] ${
          isMobileWindow
            ? 'rounded-none'
            : isMaximized
            ? 'rounded-2xl'
            : 'rounded-3xl'
        } ${
          !isMaximized && isAutoClubRhodesReservations
            ? ''
            : !isMaximized && financeDashboard
              ? 'max-w-[min(1450px,96vw)] max-h-[92vh]'
            : !isMaximized && wide
              ? 'max-w-[min(1450px,96vw)] max-h-[88vh]'
              : !isMaximized
                ? 'max-w-[1300px] max-h-[92vh]'
                : ''
        }`}
        style={{
          left: isMobileWindow ? 0 : isMaximized ? 'var(--autoclub-sidebar-width, 0px)' : position.x,
          top: isMobileWindow ? 64 : isMaximized ? 'calc(var(--autoclub-top-offset, 64px) + 52px)' : position.y,
          width: isMobileWindow ? '100vw' : isMaximized ? 'calc(100vw - var(--autoclub-sidebar-width, 0px))' : windowSize.width,
          height: isMobileWindow ? 'calc(100dvh - 64px)' : isMaximized ? 'calc(100vh - var(--autoclub-top-offset, 64px) - 52px)' : windowSize.height,
          zIndex,
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={startDrag}
          className={`flex ${
            isMobileWindow
              ? 'cursor-default px-3 py-3'
              : compactHeader
                ? 'cursor-move px-4'
                : 'cursor-move px-6'
          } items-center justify-between border-b border-slate-300 bg-[#f3f6fa] ${
            compactHeader && !isMobileWindow
              ? 'py-1.5'
              : financeDashboard && !isMobileWindow
                ? 'py-3'
                : !isMobileWindow
                  ? 'py-4'
                  : ''
          }`}
        >
          <h2 className={`min-w-0 truncate font-black tracking-tight text-slate-950 ${compactHeader ? 'text-[15px]' : 'text-lg'}`}>{title}</h2>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {titleActions}
            <button
              onClick={(event) => {
                event.stopPropagation();
                onMinimize?.();
              }}
              className={`hidden rounded-xl border border-transparent text-[0px] text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950 sm:block ${compactHeader ? 'px-2.5 py-1' : 'px-3 py-2'}`}
              aria-label="Minimize window"
            >
              <Minus className="h-4 w-4" />
              −
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onFocus?.();
                setIsMaximized((current) => !current);
              }}
              className={`hidden rounded-xl border border-transparent text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950 sm:block ${compactHeader ? 'px-2.5 py-1' : 'px-3 py-2'}`}
              aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            >
              {isMaximized ? '\u2750' : '\u25A1'}
            </button>
            <button
              onClick={onClose}
              className={`rounded-xl border border-transparent text-[0px] text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 ${compactHeader ? 'p-1.5' : 'p-2'}`}
              aria-label="Close window"
            >
              <X className="h-4 w-4" />
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`erp-module-light-content min-h-0 flex-1 overflow-auto ${
            isMobileWindow ? 'p-3' : isMaximized ? 'p-0' : financeDashboard ? 'p-5' : 'p-7'
          }`}
        >
          {children}
        </div>

        {!isMaximized && !isMobileWindow && (
          <>
            <div
              role="presentation"
              data-resize-handle="true"
              onMouseDown={startResize('right')}
              className="absolute bottom-4 right-0 top-4 w-2 cursor-ew-resize opacity-0 hover:opacity-20"
            />
            <div
              role="presentation"
              data-resize-handle="true"
              onMouseDown={startResize('left')}
              className="absolute bottom-4 left-0 top-4 w-2 cursor-ew-resize opacity-0 hover:opacity-20"
            />
            <div
              role="presentation"
              data-resize-handle="true"
              onMouseDown={startResize('bottom')}
              className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize opacity-0 hover:opacity-20"
            />
            <div
              role="presentation"
              data-resize-handle="true"
              onMouseDown={startResize('top')}
              className="absolute left-4 right-4 top-0 h-2 cursor-ns-resize opacity-0 hover:opacity-20"
            />
            <div
              role="presentation"
              data-resize-handle="true"
              onMouseDown={startResize('bottom-right')}
              className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize opacity-0 hover:opacity-20"
            />
            <div
              role="presentation"
              data-resize-handle="true"
              onMouseDown={startResize('bottom-left')}
              className="absolute bottom-0 left-0 h-4 w-4 cursor-sw-resize opacity-0 hover:opacity-20"
            />
            <div
              role="presentation"
              data-resize-handle="true"
              onMouseDown={startResize('top-right')}
              className="absolute right-0 top-0 h-4 w-4 cursor-ne-resize opacity-0 hover:opacity-20"
            />
            <div
              role="presentation"
              data-resize-handle="true"
              onMouseDown={startResize('top-left')}
              className="absolute left-0 top-0 h-4 w-4 cursor-nw-resize opacity-0 hover:opacity-20"
            />
          </>
        )}
      </div>
    </div>
  );
}
