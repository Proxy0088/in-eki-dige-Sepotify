import React from 'react';

interface FigmaLibraryIconProps {
  className?: string;
  color?: string;
}

export const FigmaLibraryIcon: React.FC<FigmaLibraryIconProps> = ({
  className = 'w-6 h-6',
  color = '#999999',
}) => {
  return (
    /* Figma Node 88:39 "Library" Component: width: 24, height: 24 */
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Node 88:47 "Rectangle Copy": left 2, top 0, width 20, height 2, rx: 1 */}
      <rect x="2" y="0" width="20" height="2" rx="1" fill={color} />

      {/* Node 88:46 "Rectangle": left 1, top 4, width 22, height 2, rx: 1 */}
      <rect x="1" y="4" width="22" height="2" rx="1" fill={color} />

      {/* Node 88:40 "Combined Shape": left 0, top 8, width 24, height 16 */}
      <rect x="0" y="8" width="24" height="16" rx="2" fill={color} />

      {/* Node 88:42 "Path 7" Cutout in Center (Music note silhouette) */}
      <path
        d="M10 13v4.2a1.8 1.8 0 1 1-1.4-1.2l1.4-.4V13h4v2.7a1.8 1.8 0 1 1-1.4-1.2l1.4-.4v-2.1h-4z"
        fill="#212121"
      />
    </svg>
  );
};
