import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';

interface AskListLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLibrary: (libraryName: string) => void;
}

export const AskListLibraryModal: React.FC<AskListLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectLibrary,
}) => {
  const [libraries, setLibraries] = useState<string[]>([]);
  const [showAddInput, setShowAddInput] = useState<boolean>(false);
  const [newLibName, setNewLibName] = useState<string>('');

  // Load user's actual libraries dynamically from storage
  useEffect(() => {
    if (isOpen) {
      const loaded = StorageService.getUserLibraries();
      setLibraries(loaded);
      setShowAddInput(false);
      setNewLibName('');
    }
  }, [isOpen]);

  const handleSelect = (name: string) => {
    onSelectLibrary(name);
    onClose();
  };

  const handleCreateNewLibrary = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLibName.trim();
    if (trimmed) {
      const updated = StorageService.addUserLibrary(trimmed);
      setLibraries(updated);
      setNewLibName('');
      setShowAddInput(false);
      handleSelect(trimmed);
    }
  };

  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'liked' || lower.includes('like') || lower.includes('علاقه')) {
      return (
        <svg
          className="w-9 h-9 fill-[#9E9E9E] group-hover:fill-white transition-colors drop-shadow-sm"
          viewBox="0 0 24 24"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    }
    if (lower.includes('download') || lower.includes('دانلود')) {
      return (
        <svg
          className="w-8 h-8 fill-[#9E9E9E] group-hover:fill-white transition-colors drop-shadow-sm"
          viewBox="0 0 24 24"
        >
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
      );
    }
    // Default Bookmark ribbon matching Figma screenshot
    return (
      <svg
        className="w-8 h-9 fill-[#9E9E9E] group-hover:fill-white transition-colors drop-shadow-sm"
        viewBox="0 0 24 24"
      >
        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3.5 7 3.5V5c0-1.1-.9-2-2-2z" />
      </svg>
    );
  };

  return (
    <>
      {/* 
        Liquid Glass SVG Filter:
        Sized for 372x444px with RGB chromatic aberration displacement mapping
      */}
      <svg
        width="0"
        height="0"
        style={{ position: 'absolute', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <filter
          id="lg-filter"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            x="0"
            y="0"
            width="372"
            height="444"
            href="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22372%22%20height%3D%22444%22%20viewBox%3D%220%200%20372%20444%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22Y%22%20x1%3D%220%22%20x2%3D%220%22%20y1%3D%223%25%22%20y2%3D%2297%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230F0%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23000%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22X%22%20x1%3D%222%25%22%20x2%3D%2298%25%22%20y1%3D%220%22%20y2%3D%220%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23F00%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23000%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22372%22%20height%3D%22444%22%20fill%3D%22%23808080%22%2F%3E%3Cg%20filter%3D%22blur(2px)%22%3E%3Crect%20width%3D%22372%22%20height%3D%22444%22%20fill%3D%22%23000080%22%2F%3E%3Crect%20width%3D%22372%22%20height%3D%22444%22%20fill%3D%22url(%23Y)%22%20style%3D%22mix-blend-mode%3Ascreen%22%2F%3E%3Crect%20width%3D%22372%22%20height%3D%22444%22%20fill%3D%22url(%23X)%22%20style%3D%22mix-blend-mode%3Ascreen%22%2F%3E%3Crect%20x%3D%2215%22%20y%3D%2215%22%20width%3D%22342%22%20height%3D%22414%22%20rx%3D%2245%22%20ry%3D%2245%22%20fill%3D%22%23808080%22%20filter%3D%22blur(15px)%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E"
            result="displacementMap"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacementMap"
            scale="124"
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feColorMatrix
            type="matrix"
            result="displacedR"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacementMap"
            scale="122"
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feColorMatrix
            type="matrix"
            result="displacedG"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacementMap"
            scale="120"
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feColorMatrix
            type="matrix"
            result="displacedB"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          />
          <feBlend in="displacedR" in2="displacedG" mode="screen" result="rg" />
          <feBlend in="rg" in2="displacedB" mode="screen" />
        </filter>
      </svg>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in select-none"
          onClick={onClose}
        >
          {/* 
            Container matching user's exact Figma layout:
            width: 372px;
            height: 444px;
            border-radius: 57px;
            top: calc(50% - 444px/2 + 11.5px);
            + Liquid Glass refraction styling
          */}
          <div
            className="w-[372px] max-w-[calc(100%-16px)] h-[444px] max-h-[calc(100dvh-20px)] rounded-[57px] relative pt-7 pb-5 px-6 flex flex-col items-center justify-between select-none overflow-hidden animate-in zoom-in-95 duration-200 ease-out origin-center"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 372,
              height: 444,
              borderRadius: 57,
              background:
                'radial-gradient(110% 90% at 50% 0%, rgba(40, 40, 40, 0.75) 0%, rgba(22, 22, 22, 0.85) 45%, rgba(12, 12, 12, 0.95) 100%)',
              backdropFilter: 'blur(2px) url(#lg-filter) blur(3px) saturate(1.6) brightness(1.1)',
              WebkitBackdropFilter: 'blur(12px) saturate(1.8) brightness(1.15) contrast(1.05)',
              border: '1.5px solid rgba(255, 255, 255, 0.16)',
              boxShadow:
                'inset 0 0 0 1px rgba(255, 255, 255, 0.15), inset 1.5px 1.5px 0 rgba(255, 255, 255, 0.5), inset 0 0 16px rgba(255, 255, 255, 0.15), 0 28px 56px -8px rgba(0, 0, 0, 0.85)',
              transform: 'translateY(11.5px)',
            }}
          >
            {/* Soft liquid glass specular sheen across the top half */}
            <div className="absolute inset-0 rounded-[57px] pointer-events-none overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[40%] bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-transparent" />
              <div className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            </div>

            {/* Title: "witch library you want to save ?" */}
            <div className="text-center mt-1 mb-2 relative z-10 flex-shrink-0">
              <h2 className="font-['Orbitron',sans-serif] font-bold text-white text-[20px] sm:text-[22px] leading-tight tracking-wide drop-shadow-sm">
                witch library you want to
                <br />
                save ?
              </h2>
            </div>

            {/* Scrollable Container with exact 2-column composition */}
            <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 py-2 relative z-10 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent] touch-pan-y">
              {showAddInput ? (
                <form
                  onSubmit={handleCreateNewLibrary}
                  className="w-full max-w-[280px] mx-auto my-auto flex flex-col items-center gap-3 py-6 animate-in fade-in"
                >
                  <input
                    type="text"
                    value={newLibName}
                    onChange={(e) => setNewLibName(e.target.value)}
                    placeholder="Folder name (e.g. Chill)"
                    autoFocus
                    className="w-full bg-[#181818]/95 border border-white/25 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/60 text-center"
                  />
                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={!newLibName.trim()}
                      className="px-5 py-2 rounded-xl bg-white text-black text-xs font-bold font-['Orbitron',sans-serif] hover:bg-[#E4E4E4] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Save & Select
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddInput(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 w-full justify-items-center pb-3">
                  {libraries.map((libName) => (
                    <button
                      key={libName}
                      type="button"
                      onClick={() => handleSelect(libName)}
                      className="flex flex-col items-center group cursor-pointer active:scale-95 transition-all focus:outline-none"
                    >
                      {/* Dark Squircle Button matching Figma: 102x102 with rounded-[32px] */}
                      <div
                        className="w-[102px] h-[102px] rounded-[32px] flex items-center justify-center transition-all group-hover:scale-105"
                        style={{
                          background: 'linear-gradient(145deg, #232323 0%, #151515 100%)',
                          border: '1px solid #333333',
                          boxShadow:
                            '0 8px 18px rgba(0, 0, 0, 0.6), inset 0 1.5px 2px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.75)',
                        }}
                      >
                        {getFolderIcon(libName)}
                      </div>

                      {/* Label underneath */}
                      <span className="font-['Orbitron',sans-serif] font-bold text-white text-[15px] mt-2 tracking-wide drop-shadow-sm text-center max-w-[120px] truncate">
                        {libName}
                      </span>
                    </button>
                  ))}

                  {/* Add New Library Squircle Button */}
                  <button
                    type="button"
                    onClick={() => setShowAddInput(true)}
                    className="flex flex-col items-center group cursor-pointer active:scale-95 transition-all focus:outline-none"
                  >
                    <div
                      className="w-[102px] h-[102px] rounded-[32px] flex items-center justify-center transition-all group-hover:scale-105 border border-dashed border-white/30 hover:border-white/60 bg-white/5"
                    >
                      <svg
                        className="w-8 h-8 stroke-[#9E9E9E] group-hover:stroke-white transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <span className="font-['Orbitron',sans-serif] font-medium text-white/70 group-hover:text-white text-[14px] mt-2 tracking-wide text-center">
                      + New
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
