import React, { useState, useEffect, memo } from 'react';
import { StorageService } from '../services/storage';

interface AskListLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLibrary: (libraryName: string) => void;
}

const AskListLibraryModalComponent: React.FC<AskListLibraryModalProps> = ({
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

  // Exact Bookmark Icon matching Figma Node 118:684 (32.81px x 41.25px in #999999)
  const renderBookmarkIcon = () => (
    <svg
      width="33"
      height="41"
      viewBox="0 0 33 41"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-xs"
    >
      <path
        d="M0 4C0 1.79086 1.79086 0 4 0H29C31.2091 0 33 1.79086 33 4V41L16.5 32.5L0 41V4Z"
        fill="#999999"
      />
    </svg>
  );

  // Exact Favorite Heart Icon matching Figma Node 118:662 (35.08px x 33.39px in #999999)
  const renderHeartIcon = () => (
    <svg
      width="35"
      height="34"
      viewBox="0 0 35 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-xs"
    >
      <path
        d="M17.5 33.39L14.96 31.02C5.95 22.61 0 17.07 0 10.22C0 4.63 4.26 0.25 9.63 0.25C12.66 0.25 15.57 1.7 17.5 3.99C19.43 1.7 22.34 0.25 25.37 0.25C30.74 0.25 35 4.63 35 10.22C35 17.07 29.05 22.61 20.04 31.02L17.5 33.39Z"
        fill="#999999"
      />
    </svg>
  );

  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'liked' || lower.includes('like') || lower.includes('علاقه')) {
      return renderHeartIcon();
    }
    return renderBookmarkIcon();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in select-none"
      onClick={onClose}
    >
      {/* 
        Figma Node 118:668 "ask list library"
        Exact specifications:
        - width: 372px
        - height: 444px
        - borderRadius: 57px
        - overflow: hidden
        - 100% GPU-accelerated glass styling (zero CPU lag)
      */}
      <div
        className="relative select-none overflow-hidden animate-in zoom-in-95 duration-150 ease-out origin-center flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 372,
          height: 444,
          borderRadius: 57,
          background:
            'radial-gradient(130% 110% at 50% 0%, rgba(42, 42, 42, 0.86) 0%, rgba(26, 26, 26, 0.94) 48%, rgba(14, 14, 14, 0.98) 100%)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow:
            'inset 0 1.5px 2px rgba(255, 255, 255, 0.35), inset 0 -1.5px 2px rgba(0, 0, 0, 0.7), -17px -17px 34px 0px rgba(43, 43, 43, 0.35), 17px 17px 34px 0px rgba(23, 23, 23, 0.55), 0 30px 60px rgba(0, 0, 0, 0.85)',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        {/* Glass specular curved sheen along perimeter */}
        <div className="absolute inset-0 rounded-[57px] pointer-events-none overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-transparent" />
          <div className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>

        {/* 
          Figma Node 118:695: "witch library you want to save ?"
          Exact geometry:
          - left: 54, top: 18, width: 254, height: 72
          - Font: Audex 400 20px, #FFFFFF, center
        */}
        <div className="pt-[18px] pb-[16px] text-center select-none flex-shrink-0 z-10 w-[254px]">
          <h2 className="font-audex font-normal text-white text-[20px] leading-[1.25] tracking-normal drop-shadow-sm select-none">
            witch library you want to
            <br />
            save ?
          </h2>
        </div>

        {/* 
          2-Column Grid Container matching exact Figma layout:
          - Column 1 at left: 54px
          - Column 2 at left: 213px
          - Row 1 at top: 113px
          - Row 2 at top: 245px
          - Row 3 at top: 383px (clipped at frame bottom 444px)
          GPU-accelerated scrolling with momentum
        */}
        <div
          className="w-full flex-1 min-h-0 overflow-y-auto no-scrollbar relative z-10 pt-[5px] pb-[20px] px-[54px] touch-pan-y overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            transform: 'translateZ(0)',
          }}
        >
          {showAddInput ? (
            <form
              onSubmit={handleCreateNewLibrary}
              className="w-full max-w-[260px] mx-auto my-auto flex flex-col items-center gap-3 py-6 animate-in fade-in"
            >
              <input
                type="text"
                value={newLibName}
                onChange={(e) => setNewLibName(e.target.value)}
                placeholder="New library name"
                autoFocus
                className="w-full bg-[#1e1e1e] border border-white/20 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/50 text-center font-audex"
              />
              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={!newLibName.trim()}
                  className="px-5 py-2 rounded-xl bg-white text-black text-xs font-audex hover:bg-[#E4E4E4] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Save & Select
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddInput(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 transition-colors cursor-pointer font-audex"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              className="w-full grid grid-cols-2 gap-x-[63px] gap-y-[35px] justify-items-center"
            >
              {libraries.map((libName) => (
                <button
                  key={libName}
                  type="button"
                  onClick={() => handleSelect(libName)}
                  className="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform duration-100 focus:outline-none"
                  style={{ transform: 'translateZ(0)' }}
                  aria-label={`Select ${libName}`}
                >
                  {/* 
                    Exact Figma Rectangle 1:
                    width: 95/97.2px, height: 95/97.2px, borderRadius: 36px
                    background: #212121
                    shadows: -17px -17px 34px #2B2B2B, 17px 17px 34px #171717
                  */}
                  <div
                    className="w-[96px] h-[96px] rounded-[36px] bg-[#212121] flex items-center justify-center border border-white/[0.04]"
                    style={{
                      boxShadow:
                        '-13px -13px 26px #282828, 13px 13px 26px #161616, inset 0 1px 1px rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    {getFolderIcon(libName)}
                  </div>

                  {/* 
                    Exact Figma Label:
                    Audex 400 15px, #FFFFFF, center, width: 73px, height: 35px
                  */}
                  <span className="font-audex font-normal text-white text-[15px] mt-[6px] text-center w-[96px] truncate drop-shadow-xs">
                    {libName}
                  </span>
                </button>
              ))}

              {/* Subtle Add New Library Squircle */}
              <button
                type="button"
                onClick={() => setShowAddInput(true)}
                className="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform duration-100 focus:outline-none"
                style={{ transform: 'translateZ(0)' }}
                aria-label="Add new library"
              >
                <div
                  className="w-[96px] h-[96px] rounded-[36px] bg-[#212121]/50 border border-dashed border-white/25 flex items-center justify-center group-hover:border-white/50"
                >
                  <svg
                    className="w-8 h-8 stroke-[#999999] group-hover:stroke-white transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                    <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="font-audex font-normal text-[#999999] group-hover:text-white text-[14px] mt-[6px] text-center w-[96px] truncate">
                  + New
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AskListLibraryModal = memo(AskListLibraryModalComponent);
