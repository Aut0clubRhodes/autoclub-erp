'use client';

interface WindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Window({ title, onClose, children }: WindowProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl w-full max-w-[1100px] h-[700px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
            aria-label="Close window"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
