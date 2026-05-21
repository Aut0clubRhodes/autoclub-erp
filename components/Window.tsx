'use client';

import { useEffect, useRef, useState } from 'react';

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
}: WindowProps) {
  const [windowSize, setWindowSize] = useState({
    width: initialWidth || 1100,
    height: initialHeight || 720,
  });
  const [position, setPosition] = useState({
    x: 320 + Math.round(Math.random() * 24),
    y: 80 + Math.round(Math.random() * 24),
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
  } | null>(null);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    x: number;
    y: number;
  } | null>(null);

  const clampPosition = (x: number, y: number) => {
    const maxX = window.innerWidth - windowSize.width - 20;
    const maxY = window.innerHeight - windowSize.height - 20;

    return {
      x: Math.min(Math.max(x, 240), Math.max(240, maxX)),
      y: Math.min(Math.max(y, 20), Math.max(20, maxY)),
    };
  };

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-resize-handle="true"]')) return;

    event.preventDefault();
    onFocus?.();
    dragStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      x: position.x,
      y: position.y,
    };
  };

  const startResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizeStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      width: windowSize.width,
      height: windowSize.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeStartRef.current) return;

      const nextWidth = resizeStartRef.current.width + event.clientX - resizeStartRef.current.mouseX;
      const nextHeight = resizeStartRef.current.height + event.clientY - resizeStartRef.current.mouseY;
      const maxWidth = window.innerWidth - 40;
      const maxHeight = window.innerHeight - 40;

      setWindowSize({
        width: Math.min(Math.max(nextWidth, 720), maxWidth),
        height: Math.min(Math.max(nextHeight, 480), maxHeight),
      });
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
        className={`premium-window-in pointer-events-auto fixed flex flex-col overflow-hidden rounded-[24px] border border-sky-100/[0.1] bg-[linear-gradient(180deg,rgba(13,20,30,0.96),rgba(7,12,18,0.98))] shadow-[0_24px_90px_rgba(0,0,0,0.58)] backdrop-blur-xl ${
          fullscreen
            ? 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]'
            : financeDashboard
              ? 'max-w-[min(1180px,94vw)] max-h-[88vh]'
            : wide
              ? 'max-w-[min(1220px,92vw)] max-h-[78vh]'
              : 'max-w-[1100px] max-h-[90vh]'
        }`}
        style={{
          left: position.x,
          top: position.y,
          width: windowSize.width,
          height: isMinimized ? 56 : windowSize.height,
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
            {!isMinimized && titleActions}
            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsMinimized((current) => !current);
              }}
              className="rounded-xl border border-transparent px-3 py-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
              aria-label={isMinimized ? 'Restore window' : 'Minimize window'}
            >
              −
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
        {!isMinimized && (
          <div
            className={`min-h-0 flex-1 ${
              fullscreen
                ? 'overflow-hidden p-0'
                : financeDashboard
                  ? 'overflow-hidden p-4'
                  : 'overflow-hidden p-6'
            }`}
          >
            {children}
          </div>
        )}

        {!isMinimized && (
          <div
            role="presentation"
            data-resize-handle="true"
            onMouseDown={startResize}
            className="absolute bottom-3 right-3 h-4 w-4 cursor-se-resize rounded-sm border-b-2 border-r-2 border-sky-200/70 opacity-50 transition hover:opacity-100"
          />
        )}
      </div>
    </div>
  );
}
