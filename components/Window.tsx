'use client';

import { useEffect, useRef, useState } from 'react';

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
  initialWidth,
  initialHeight,
  zIndex,
  onFocus,
  onMinimize,
}: WindowProps) {
  const [isMaximized, setIsMaximized] = useState(fullscreen);
  const [windowSize, setWindowSize] = useState({
    width: initialWidth || 1100,
    height: initialHeight || 720,
  });
  const [position, setPosition] = useState({
    x: 320 + Math.round(Math.random() * 24),
    y: 80 + Math.round(Math.random() * 24),
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

  const clampPosition = (x: number, y: number) => {
    return {
      x: Math.min(Math.max(x, 230), window.innerWidth - 120),
      y: Math.min(Math.max(y, 10), window.innerHeight - 80),
    };
  };

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-resize-handle="true"]')) return;
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
        nextX = Math.min(Math.max(desiredX, 230), maxX);
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
        className={`premium-window-in pointer-events-auto fixed flex flex-col overflow-hidden border border-sky-100/[0.1] bg-[linear-gradient(180deg,rgba(13,20,30,0.96),rgba(7,12,18,0.98))] shadow-[0_24px_90px_rgba(0,0,0,0.58)] backdrop-blur-xl ${
          isMaximized
            ? 'rounded-2xl'
            : 'rounded-3xl'
        } ${
          !isMaximized && financeDashboard
              ? 'max-w-[min(1180px,94vw)] max-h-[88vh]'
            : !isMaximized && wide
              ? 'max-w-[min(1220px,92vw)] max-h-[78vh]'
              : !isMaximized
                ? 'max-w-[1100px] max-h-[90vh]'
                : ''
        }`}
        style={{
          left: isMaximized ? 250 : position.x,
          top: isMaximized ? 52 : position.y,
          width: isMaximized ? 'calc(100vw - 250px)' : windowSize.width,
          height: isMaximized ? 'calc(100vh - 52px)' : windowSize.height,
          zIndex,
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={startDrag}
          className={`flex cursor-move items-center justify-between border-b border-sky-100/[0.08] px-6 ${financeDashboard ? 'py-3' : 'py-4'}`}
        >
          <h2 className="text-base font-semibold tracking-tight text-[#f4f7fb]">{title}</h2>
          <div className="flex items-center gap-3">
            {titleActions}
            <button
              onClick={(event) => {
                event.stopPropagation();
                onMinimize?.();
              }}
              className="rounded-xl border border-transparent px-3 py-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
              aria-label="Minimize window"
            >
              −
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onFocus?.();
                setIsMaximized((current) => !current);
              }}
              className="rounded-xl border border-transparent px-3 py-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
              aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            >
              {isMaximized ? '\u2750' : '\u25A1'}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
              aria-label="Close window"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`min-h-0 flex-1 overflow-auto ${
            isMaximized ? 'p-0' : financeDashboard ? 'p-4' : 'p-6'
          }`}
        >
          {children}
        </div>

        {!isMaximized && (
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
