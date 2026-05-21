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
}: WindowProps) {
  const [windowSize, setWindowSize] = useState({
    width: initialWidth || 1100,
    height: initialHeight || 720,
  });
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
  } | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02050a]/55 p-4 backdrop-blur-[3px]">
      <div
        className={`premium-window-in relative flex flex-col overflow-hidden rounded-[24px] border border-sky-100/[0.1] bg-[linear-gradient(180deg,rgba(13,20,30,0.96),rgba(7,12,18,0.98))] shadow-[0_24px_90px_rgba(0,0,0,0.58)] backdrop-blur-xl ${
          fullscreen
            ? 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]'
            : financeDashboard
              ? 'max-w-[min(1180px,94vw)] max-h-[88vh]'
            : wide
              ? 'max-w-[min(1220px,92vw)] max-h-[78vh]'
              : 'max-w-[1100px] max-h-[90vh]'
        }`}
        style={{
          width: windowSize.width,
          height: windowSize.height,
        }}
      >
        {/* Title Bar */}
        <div className={`flex items-center justify-between border-b border-sky-100/[0.08] px-6 ${financeDashboard ? 'py-3' : 'py-4'}`}>
          <h2 className="text-base font-semibold tracking-tight text-[#f4f7fb]">{title}</h2>
          <div className="flex items-center gap-3">
            {titleActions}
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

        <div
          role="presentation"
          onMouseDown={startResize}
          className="absolute bottom-3 right-3 h-4 w-4 cursor-se-resize rounded-sm border-b-2 border-r-2 border-sky-200/70 opacity-50 transition hover:opacity-100"
        />
      </div>
    </div>
  );
}
