import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'hero' | 'floating';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed and running in standalone window mode, suppress install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  // Base styling for nav button
  const buttonContent = (
    <>
      <Download className="w-4 h-4 text-blue-950" />
      <span>Install App</span>
    </>
  );

  return (
    <>
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          title="Install House of Power Ministry App on your phone or computer"
          className={
            className ||
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer ring-1 ring-yellow-500'
          }
        >
          {buttonContent}
        </button>
      )}

      {/* iOS Safari flow */}
      {isIOS && !isInstallable && (
        <>
          <button
            onClick={() => setShowIOSGuide(true)}
            title="Install House of Power Ministry App on iPhone / iPad"
            className={
              className ||
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer ring-1 ring-yellow-500'
            }
          >
            <Smartphone className="w-4 h-4 text-blue-950" />
            <span>Install App</span>
          </button>

          {showIOSGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border-2 border-blue-950 text-left relative">
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-950 p-2 flex items-center justify-center">
                    <img
                      src="/church_logo.jpg"
                      alt="HOP Ministry Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-blue-950 text-base leading-tight">
                      Install HOP Ministry
                    </h3>
                    <p className="text-xs text-yellow-600 font-bold">
                      Mankessim, Ghana
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-gray-700 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 mb-5">
                  <div className="flex items-start gap-2">
                    <span className="font-black text-blue-900 bg-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                      1
                    </span>
                    <p>
                      Tap the <strong>Share</strong> button (box with an arrow pointing upward) in the Safari toolbar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-black text-blue-900 bg-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                      2
                    </span>
                    <p>
                      Scroll down and tap <strong>Add to Home Screen</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-black text-blue-900 bg-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                      3
                    </span>
                    <p>
                      Tap <strong>Add</strong> in the top-right corner to place the app on your home screen.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-yellow-400 font-black text-xs transition shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Got it</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};
