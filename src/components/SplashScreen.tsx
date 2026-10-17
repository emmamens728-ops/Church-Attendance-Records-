import React, { useEffect, useState, useRef } from 'react';
import churchLogoFile from '../assets/images/church_logo.jpg';
import { getStoredLogo } from '../utils/storage';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    return getStoredLogo() || churchLogoFile;
  });
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  // Safeguards to prevent the 20-second timer from restarting on re-renders
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const hasStartedRef = useRef(false);

  // Prevent any body scrollbar or movement during splash screen
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    // Also listen for any logo updates from storage
    const handleLogoUpdate = () => {
      const stored = getStoredLogo();
      if (stored) setLogoSrc(stored);
    };
    window.addEventListener('hop_logo_updated', handleLogoUpdate);

    // Exact 20-second duration requirement
    // Timer starts as soon as splash screen mounts/becomes visible
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;

      // Start graceful smooth fade-out slightly before 20s (at 19.3s) for a seamless 700ms crossfade
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 19300);

      // Transition to homepage/login screen exactly at 20 seconds
      const completeTimer = setTimeout(() => {
        onCompleteRef.current();
      }, 20000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(completeTimer);
        window.removeEventListener('hop_logo_updated', handleLogoUpdate);
      };
    }

    return () => {
      window.removeEventListener('hop_logo_updated', handleLogoUpdate);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white w-screen h-screen min-h-screen overflow-hidden select-none transition-opacity duration-700 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#ffffff',
        margin: 0,
        padding: 0,
      }}
      aria-label="House of Power of Ministry International Church Loading Screen"
      role="dialog"
      aria-modal="true"
    >
      {/* Centered Logo Container with Responsive Proportionate Sizing */}
      <div className="flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-full">
        <div className="w-[80vw] max-w-[85vw] sm:w-[320px] md:w-[380px] lg:w-[420px] sm:max-w-[420px] flex items-center justify-center">
          <img
            src={logoSrc}
            alt="HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH - Mankessim"
            className="w-full h-auto max-h-[50vh] sm:max-h-[55vh] object-contain select-none pointer-events-none"
            style={{ objectFit: 'contain' }}
            loading="eager"
            decoding="sync"
          />
        </div>

        {/* Loading Indicator: "Loading..." with smooth 3-dot animation in Church Blue & Gold */}
        <div className="mt-6 sm:mt-8 flex flex-col items-center justify-center gap-3">
          <span className="text-blue-950 font-bold text-base sm:text-lg tracking-wide select-none">
            Loading...
          </span>

          {/* Three small dots that animate gently */}
          <div className="flex items-center gap-2" aria-hidden="true">
            <span
              className="w-2.5 h-2.5 rounded-full bg-blue-900 animate-bounce"
              style={{
                animationDuration: '1.2s',
                animationDelay: '0ms',
              }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-bounce"
              style={{
                animationDuration: '1.2s',
                animationDelay: '200ms',
              }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full bg-blue-900 animate-bounce"
              style={{
                animationDuration: '1.2s',
                animationDelay: '400ms',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
