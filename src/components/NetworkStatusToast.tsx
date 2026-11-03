import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { AppLanguage } from '../types/music';

interface NetworkStatusToastProps {
  language?: AppLanguage;
}

export const NetworkStatusToast: React.FC<NetworkStatusToastProps> = ({ language = 'en' }) => {
  const [networkState, setNetworkState] = useState<'idle' | 'offline' | 'restored'>('idle');
  const offlineTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const wasOfflineRef = useRef<boolean>(false);

  useEffect(() => {
    const handleOffline = () => {
      // Clear any pending restore hide timer
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      // Wait 2.5 seconds before showing red banner if connection remains lost
      if (!offlineTimeoutRef.current) {
        offlineTimeoutRef.current = window.setTimeout(() => {
          if (!navigator.onLine) {
            wasOfflineRef.current = true;
            setNetworkState('offline');
          }
        }, 2500);
      }
    };

    const handleOnline = () => {
      // Clear offline trigger timer if reconnected before threshold
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
        offlineTimeoutRef.current = null;
      }

      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setNetworkState('restored');

        // Auto-dismiss the green restored toast after 3.5 seconds
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = window.setTimeout(() => {
          setNetworkState('idle');
          hideTimeoutRef.current = null;
        }, 3500);
      } else {
        setNetworkState('idle');
      }
    };

    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  if (networkState === 'idle') {
    return null;
  }

  const isOffline = networkState === 'offline';

  return (
    <div className="absolute top-[76px] sm:top-[82px] inset-x-4 sm:inset-x-8 z-[100] flex justify-center pointer-events-none select-none">
      <div
        className={`px-4 py-2.5 rounded-full flex items-center gap-2.5 shadow-2xl backdrop-blur-xl border transition-all duration-300 transform animate-in fade-in slide-in-from-top-3 ${
          isOffline
            ? 'lastwave-toast-red text-red-200'
            : 'lastwave-toast-green text-emerald-200'
        }`}
      >
        {isOffline ? (
          <>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs font-medium tracking-wide">
              {language === 'fa'
                ? 'اتصال اینترنت قطع شد • در انتظار اتصال مجدد...'
                : 'Internet connection lost • Waiting to reconnect...'}
            </span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-medium tracking-wide">
              {language === 'fa'
                ? 'اتصال اینترنت برقرار شد'
                : 'Internet connection restored'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
