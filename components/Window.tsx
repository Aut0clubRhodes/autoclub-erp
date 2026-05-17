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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02050a]/55 p-4 backdrop-blur-[3px]">
      <div
        className={`flex flex-col overflow-hidden rounded-[24px] border border-sky-100/[0.1] bg-[linear-gradient(180deg,rgba(13,20,30,0.96),rgba(7,12,18,0.98))] shadow-[0_24px_90px_rgba(0,0,0,0.58)] backdrop-blur-xl ${
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
