import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { getStoredLogo } from '../utils/storage';

interface ChurchLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showUploadButton?: boolean;
  onOpenUploadModal?: () => void;
  className?: string;
  withTagline?: boolean;
}

export const ChurchLogo: React.FC<ChurchLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(getStoredLogo());
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setLogoSrc(getStoredLogo());
      setImgError(false);
    };
    window.addEventListener('hop_logo_updated', handleUpdate);
    return () => window.removeEventListener('hop_logo_updated', handleUpdate);
  }, []);

  // Size specifications
  const sizeClasses = {
    sm: 'w-10 h-10 min-w-10 min-h-10 text-xs',
    md: 'w-14 h-14 min-w-14 min-h-14 text-sm',
    lg: 'w-20 h-20 min-w-20 min-h-20 text-base',
    xl: 'w-28 h-28 min-w-28 min-h-28 text-lg',
    hero: 'w-36 h-36 min-w-36 min-h-36 sm:w-44 sm:h-44 sm:min-w-44 sm:min-h-44 text-xl',
  };

  const isCustomLogo = Boolean(logoSrc && !imgError);

  return (
    <div className={`relative inline-flex flex-col items-center group ${className}`}>
      <div
        className={`${sizeClasses[size]} relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 p-1 shadow-lg ring-2 ring-yellow-400/80 transition-all duration-300 hover:ring-yellow-300 hover:shadow-yellow-400/20`}
        title="House of Power of Ministry International Church Official Emblem"
      >
        {isCustomLogo ? (
          <img
            src={logoSrc!}
            alt="HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH Official Logo"
            className="w-full h-full object-contain rounded-xl p-0.5"
            onError={() => setImgError(true)}
          />
        ) : (
          /* High-Fidelity Official Church Seal & Crest SVG */
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full overflow-visible drop-shadow-md"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="50%" stopColor="#EAB308" />
                <stop offset="100%" stopColor="#CA8A04" />
              </linearGradient>
              <linearGradient id="crestBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1E3A8A" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
              <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="40%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#FDE047" />
              </linearGradient>
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Outer Decorative Ring */}
            <circle cx="100" cy="100" r="92" fill="none" stroke="url(#crestGold)" strokeWidth="4" />
            <circle cx="100" cy="100" r="86" fill="url(#crestBlue)" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Inner Shield / Seal */}
            <circle cx="100" cy="100" r="74" fill="#0F2B66" />

            {/* Divine Light Rays */}
            <g opacity="0.25" stroke="#FDE047" strokeWidth="1">
              <line x1="100" y1="28" x2="100" y2="40" />
              <line x1="100" y1="160" x2="100" y2="172" />
              <line x1="28" y1="100" x2="40" y2="100" />
              <line x1="160" y1="100" x2="172" y2="100" />
              <line x1="48" y1="48" x2="58" y2="58" />
              <line x1="152" y1="48" x2="142" y2="58" />
              <line x1="48" y1="152" x2="58" y2="142" />
              <line x1="152" y1="152" x2="142" y2="142" />
            </g>

            {/* Holy Ghost Pentecostal Flame of Power behind cross */}
            <path
              d="M100 45 C112 60 120 75 116 92 C114 98 108 102 100 102 C92 102 86 98 84 92 C80 75 88 60 100 45 Z"
              fill="url(#flameGrad)"
              opacity="0.9"
              filter="url(#softGlow)"
            />

            {/* Radiant Golden Cross */}
            <g id="cross">
              {/* Vertical Beam */}
              <rect x="94" y="44" width="12" height="74" rx="2" fill="url(#crestGold)" stroke="#92400E" strokeWidth="0.8" />
              {/* Horizontal Beam */}
              <rect x="76" y="62" width="48" height="12" rx="2" fill="url(#crestGold)" stroke="#92400E" strokeWidth="0.8" />
              {/* Center Diamond Jewel */}
              <polygon points="100,64 104,68 100,72 96,68" fill="#FFFFFF" />
            </g>

            {/* Open Holy Bible at Bottom of Cross */}
            <g id="bible" transform="translate(0, 10)">
              {/* Left Page */}
              <path d="M100 104 C88 100 70 101 60 106 L60 125 C70 120 88 120 100 124 Z" fill="#FFFFFF" stroke="#92400E" strokeWidth="1" />
              {/* Right Page */}
              <path d="M100 104 C112 100 130 101 140 106 L140 125 C130 120 112 120 100 124 Z" fill="#FFFFFF" stroke="#92400E" strokeWidth="1" />
              {/* Book Spine */}
              <line x1="100" y1="104" x2="100" y2="124" stroke="#B45309" strokeWidth="2" />
              {/* Scriptures Markings */}
              <line x1="68" y1="110" x2="92" y2="110" stroke="#1E3A8A" strokeWidth="1" opacity="0.6" />
              <line x1="68" y1="114" x2="90" y2="114" stroke="#1E3A8A" strokeWidth="1" opacity="0.6" />
              <line x1="68" y1="118" x2="93" y2="118" stroke="#1E3A8A" strokeWidth="1" opacity="0.6" />
              <line x1="107" y1="110" x2="132" y2="110" stroke="#1E3A8A" strokeWidth="1" opacity="0.6" />
              <line x1="109" y1="114" x2="132" y2="114" stroke="#1E3A8A" strokeWidth="1" opacity="0.6" />
              <line x1="107" y1="118" x2="128" y2="118" stroke="#1E3A8A" strokeWidth="1" opacity="0.6" />
            </g>

            {/* Holy Spirit Dove Silhouette */}
            <path
              d="M100 48 C96 48 93 45 92 42 C88 47 80 50 72 49 C80 54 85 57 88 61 C91 63 94 62 97 59 C99 61 101 61 103 59 C106 62 109 63 112 61 C115 57 120 54 128 49 C120 50 112 47 108 42 C107 45 104 48 100 48 Z"
              fill="#FFFFFF"
              opacity="0.95"
            />

            {/* Bottom Laurel Banner with Location & Motto */}
            <path d="M46 142 Q100 158 154 142 L150 156 Q100 172 50 156 Z" fill="url(#crestGold)" stroke="#78350F" strokeWidth="1" />
            <text x="100" y="152" textAnchor="middle" fill="#0F172A" fontSize="7.5" fontWeight="900" letterSpacing="0.8">
              HOUSE OF POWER
            </text>
            <text x="100" y="161" textAnchor="middle" fill="#0F2B66" fontSize="6" fontWeight="800" letterSpacing="0.5">
              MANKESSIM
            </text>

            {/* Small Stars */}
            <polygon points="100,32 101.5,35 105,35 102,37 103,40 100,38 97,40 98,37 95,35 98.5,35" fill="#FDE047" />
          </svg>
        )}

        {/* Small corner emblem badge */}
        <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-blue-950 p-0.5 rounded-full ring-2 ring-white shadow">
          <Sparkles className="w-2.5 h-2.5" />
        </div>
      </div>
    </div>
  );
};
