'use client';

import { useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import Window from '@/components/Window';

type WindowType = 'Αυτοκίνητα' | 'Ταμείο' | 'Προμηθευτές' | null;

export default function Home() {
  const [activeWindow, setActiveWindow] = useState<WindowType>(null);

  const handleWindowOpen = (windowId: string) => {
    setActiveWindow(windowId as WindowType);
  };

  const handleWindowClose = () => {
    setActiveWindow(null);
  };

  const renderWindowContent = () => {
    switch (activeWindow) {
      case 'Αυτοκίνητα':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-zinc-400 text-lg">Η διαχείριση στόλου θα εμφανίζεται εδώ</p>
            </div>
          </div>
        );
      case 'Ταμείο':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-zinc-400 text-lg">Τα οικονομικά δεδομένα θα εμφανίζονται εδώ</p>
            </div>
          </div>
        );
      case 'Προμηθευτές':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-zinc-400 text-lg">Οι προμηθευτές θα εμφανίζονται εδώ</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getWindowTitle = () => {
    switch (activeWindow) {
      case 'Αυτοκίνητα':
        return 'Διαχείριση Αυτοκινήτων';
      case 'Ταμείο':
        return 'Ταμείο';
      case 'Προμηθευτές':
        return 'Προμηθευτές';
      default:
        return '';
    }
  };

  return (
    <>
      <Sidebar onWindowOpen={handleWindowOpen} />
      <main className="flex-1 relative bg-zinc-950">
        {/* Homepage with centered logo */}
        {!activeWindow && (
          <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
            <div className="w-[500px] h-[500px] flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="AUTOCLUB"
                fill
                priority
                className="object-contain opacity-60 drop-shadow-2xl"
                sizes="500px"
              />
            </div>
          </div>
        )}

        {/* Floating Window */}
        {activeWindow && (
          <Window title={getWindowTitle()} onClose={handleWindowClose}>
            {renderWindowContent()}
          </Window>
        )}
      </main>
    </>
  );
}

