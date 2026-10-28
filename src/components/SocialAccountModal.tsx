import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  User,
  Sparkles,
  Music,
  Wifi,
  Copy,
  Check,
  Heart,
  Download,
  Radio,
  Smartphone,
  ExternalLink,
  Share2,
} from 'lucide-react';

interface SocialAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'group' | 'mobile';
  likedCount: number;
  downloadedCount: number;
}

export const SocialAccountModal: React.FC<SocialAccountModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile',
  likedCount,
  downloadedCount,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'group' | 'mobile'>(initialTab);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText('SYNC-7821');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyUrl = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div
      className="absolute inset-0 bg-black/25 backdrop-blur-[2px] flex items-center justify-center p-5 z-50 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* 
        Apple iOS Liquid Glass Card:
        - Completely transparent liquid glass refraction over the existing application UI
        - No opaque background fill: the app UI beneath is naturally blurred & refracted
        - Apple-style specular rim highlight & subtle depth
      */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[340px] rounded-[36px] p-6 transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(35px) saturate(190%) contrast(105%)',
          WebkitBackdropFilter: 'blur(35px) saturate(190%) contrast(105%)',
          border: '1px solid rgba(255, 255, 255, 0.26)',
          boxShadow:
            '0 30px 60px -15px rgba(0, 0, 0, 0.65), inset 0 1.5px 2px rgba(255, 255, 255, 0.5), inset 0 -1px 1px rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Subtle iOS top specular liquid reflection edge */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        {/* Close Button: iOS Liquid Glass Pill */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer z-10 active:scale-95 shadow-sm"
          aria-label="Close"
        >
          <X className="w-4 h-4 stroke-[2]" />
        </button>

        {/* iOS Segmented Control: Tab Switcher */}
        <div
          className="flex items-center gap-1 p-1 rounded-full mb-4 w-full"
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white/25 text-white shadow-sm border border-white/30'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <User className="w-3 h-3" />
            <span>اکانت</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('group')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'group'
                ? 'bg-white/25 text-white shadow-sm border border-white/30'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>رفیق‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mobile')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'mobile'
                ? 'bg-white/25 text-white shadow-sm border border-white/30'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3 text-sky-400" />
            <span>گوشی / PWA</span>
          </button>
        </div>

        {/* View 1: اکانت کاربر (Original Profile info in Liquid Glass) */}
        {activeTab === 'profile' && (
          <div className="flex flex-col items-center text-center animate-in fade-in duration-200">
            {/* Liquid Glass Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-3 shadow-inner"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
              }}
            >
              <Music className="w-7 h-7 text-white" />
            </div>

            <h3 className="font-roboto text-base font-bold text-white tracking-tight mb-0.5">
              Account Profile
            </h3>
            <p className="text-xs font-mono text-white/70 mb-4">
              dadashtf@gmail.com
            </p>

            {/* Liquid Glass Info Container */}
            <div
              className="w-full rounded-[24px] p-3.5 mb-4 text-left space-y-2.5 relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  موتور صوتی
                </span>
                <span className="text-emerald-400 font-mono text-[11px] font-semibold">
                  WebAudio & Stream
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  آهنگ‌های لایک‌شده
                </span>
                <span className="font-mono font-bold text-white">
                  {likedCount} آهنگ
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  دانلودهای آفلاین
                </span>
                <span className="font-mono font-bold text-white">
                  {downloadedCount} ذخیره
                </span>
              </div>
            </div>
          </div>
        )}

        {/* View 2: گوش دادن با رفیق‌ها (Original Social Listening in Liquid Glass) */}
        {activeTab === 'group' && (
          <div className="flex flex-col items-center text-center animate-in fade-in duration-200">
            {/* Liquid Glass Radio Icon */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-3 shadow-inner"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
              }}
            >
              <Radio className="w-7 h-7 text-white animate-pulse" />
            </div>

            <h3 className="font-roboto text-base font-bold text-white tracking-tight mb-0.5">
              گوش دادن با رفیق‌ها
            </h3>
            <p className="text-xs text-white/70 leading-relaxed mb-4 max-w-[260px]">
              پخش موزیک به صورت همزمان با دوستان اطراف همگام می‌شود.
            </p>

            {/* Liquid Glass Social Live Session */}
            <div
              className="w-full rounded-[24px] p-3.5 mb-4 text-left relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold text-white/90 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  جلسه فعال لایو
                </span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  آنلاین
                </span>
              </div>

              {/* Connected Friends in Liquid Glass */}
              <div className="flex items-center justify-between">
                <div className="flex items-center -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[11px] font-bold text-white backdrop-blur-md">
                    علی
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[11px] font-bold text-white backdrop-blur-md">
                    سارا
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[11px] font-bold text-white backdrop-blur-md">
                    رضا
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-white block">
                    ۳ رفیق متصل
                  </span>
                  <span className="text-[10px] text-white/60 font-mono">
                    همگام با پخش
                  </span>
                </div>
              </div>
            </div>

            {/* Session Code Bar */}
            <div
              className="w-full flex items-center justify-between p-2.5 rounded-[20px] mb-4"
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <span className="text-xs font-mono font-bold text-white/90 tracking-wider pl-2">
                SYNC-7821
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-semibold text-white transition-all cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی لینک</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* View 3: تست و نصب در گوشی (Mobile & PWA) */}
        {activeTab === 'mobile' && (
          <div className="flex flex-col items-center text-center animate-in fade-in duration-200">
            {/* Liquid Glass Smartphone Icon */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white mb-2.5 shadow-inner"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
              }}
            >
              <Smartphone className="w-6 h-6 text-sky-300 animate-pulse" />
            </div>

            <h3 className="font-roboto text-sm font-bold text-white tracking-tight mb-0.5">
              تست و اجرای اپلیکیشن در گوشی
            </h3>
            <p className="text-[11px] text-white/70 leading-relaxed mb-3 max-w-[280px]">
              این برنامه دارای ساختار استاندارد PWA (Progressive Web App) است و مستقیماً روی گوشی نصب می‌شود.
            </p>

            {/* Step 1: Copy Link */}
            <div
              className="w-full rounded-[20px] p-3 mb-2.5 text-right relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-sky-300 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  ۱. لینک باز کردن در مرورگر گوشی
                </span>
                <span className="text-[10px] text-white/50 font-mono">Chrome / Safari</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-semibold text-white transition-all cursor-pointer active:scale-98 shadow-sm"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>لینک کپی شد (در گوشی باز کنید)</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی لینک برنامه جهت ارسال به گوشی</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 2: Install App on Phone (PWA) */}
            <div
              className="w-full rounded-[20px] p-3 mb-2.5 text-right relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  ۲. نصب مستقیم روی گوشی (PWA)
                </span>
                <span className="text-[10px] text-white/50">بدون استور</span>
              </div>

              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full mb-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-gradient-to-r from-sky-500/40 to-emerald-500/40 hover:from-sky-500/60 hover:to-emerald-500/60 border border-white/40 text-xs font-bold text-white transition-all cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-300" />
                  <span>همین حالا روی گوشی نصب کن (Install)</span>
                </button>
              )}

              <div className="space-y-1.5 text-[11px] text-white/80 leading-normal">
                <div className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-white">در اندروید (Chrome):</strong> منوی ۳ نقطه بالا <code className="bg-black/30 px-1 py-0.5 rounded text-[10px]">⋮</code> را بزنید و گزینه <strong className="text-emerald-300">«Install app»</strong> یا «Add to Home screen» را انتخاب کنید.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-white">در آیفون (Safari):</strong> دکمه اشتراک <code className="bg-black/30 px-1 py-0.5 rounded text-[10px]">⎙ Share</code> را بزنید و گزینه <strong className="text-sky-300">«Add to Home Screen»</strong> را بزنید.
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Native APK (Capacitor) */}
            <div
              className="w-full rounded-[18px] p-2.5 mb-3 text-right"
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span className="text-[10px] font-semibold text-white/90 block mb-1">
                ⚙️ تبدیل به فایل نصبی APK (نیتیو اندروید):
              </span>
              <p className="text-[10px] text-white/60 leading-relaxed">
                با پکیج <span className="font-mono text-white/80">@capacitor/android</span> در چند ثانیه کدها درون یک پروژه اندروید استودیو قرار گرفته و فایل <span className="font-mono text-emerald-400">.apk</span> خروجی داده می‌شود.
              </p>
            </div>
          </div>
        )}

        {/* iOS Liquid Glass Pill Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-full font-semibold text-xs text-white tracking-wide cursor-pointer transition-all duration-200 active:scale-[0.98] shadow-md"
          style={{
            background: 'rgba(255, 255, 255, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)',
          }}
        >
          بستن
        </button>
      </div>
    </div>
  );
};
