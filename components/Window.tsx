'use client';

interface WindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  titleActions?: React.ReactNode;
  fullscreen?: boolean;
  wide?: boolean;
  financeDashboard?: boolean;
}

export default function Window({
  title,
  onClose,
  children,
  titleActions,
  fullscreen = false,
  wide = false,
  financeDashboard = false,
}: WindowProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden ${
          fullscreen
            ? 'w-full max-w-[1480px] h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]'
            : financeDashboard
              ? 'w-full max-w-[min(1180px,94vw)] h-auto max-h-[88vh]'
            : wide
              ? 'w-fit max-w-[min(1220px,92vw)] h-[min(700px,78vh)] max-h-[78vh]'
              : 'w-full max-w-[1100px] h-[700px] max-h-[90vh]'
        }`}
      >
        {/* Title Bar */}
        <div className={`flex items-center justify-between px-6 border-b border-zinc-700 ${financeDashboard ? 'py-3' : 'py-4'}`}>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <div className="flex items-center gap-3">
            {titleActions}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
              aria-label="Close window"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`flex-1 ${
            fullscreen
              ? 'overflow-auto p-0'
              : financeDashboard
                ? 'overflow-auto p-4 md:overflow-hidden'
                : 'overflow-auto p-6'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
