import React, { useState } from 'react';
import {
  BookOpen,
  Shield,
  ArrowRight,
  Mic,
  Users,
  Image as ImageIcon,
  Maximize2,
  X,
  Church,
  Sparkles,
} from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';
import { HomepageImagesConfig } from '../types';

interface HomePageProps {
  onGoToAttendance: () => void;
  onGoToAdmin: () => void;
  onOpenLogoModal?: () => void;
  totalMembersCount: number;
  homepageImages: HomepageImagesConfig;
}

export const HomePage: React.FC<HomePageProps> = ({
  onGoToAttendance,
  onGoToAdmin,
  totalMembersCount,
  homepageImages,
}) => {
  // Lightbox Modal for viewing full images
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
    caption?: string;
    label: string;
  } | null>(null);

  const image1 = homepageImages.image1;
  const image2 = homepageImages.image2;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-6 px-4">
      {/* Central Branding Container */}
      <div className="w-full max-w-4xl flex flex-col items-center text-center">
        {/* Official Church Logo */}
        <div className="transition-transform duration-300 hover:scale-105">
          <ChurchLogo size="hero" showUploadButton={false} />
        </div>

        {/* Church Name & Location */}
        <div className="mt-5 space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-blue-950 tracking-tight leading-tight uppercase">
            HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="font-black text-blue-950 bg-yellow-400 text-sm sm:text-base px-3.5 py-1 rounded-xl shadow-xs tracking-wide">
              LOCATION: MANKESSIM
            </span>
            <span className="text-xs sm:text-sm text-gray-500 font-semibold hidden sm:inline">
              Central Region, Ghana
            </span>
          </div>

          <p className="text-xs sm:text-sm md:text-base text-blue-900/80 font-medium italic pt-1 max-w-lg mx-auto">
            &ldquo;Empowered by the Holy Spirit • Walking in Divine Power & Dominion&rdquo;
          </p>
        </div>

        {/* Two Customizable Homepage Image Areas (Read-Only Display) */}
        <section aria-label="Church Showcase Images" className="mt-8 sm:mt-10 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 text-left">
            {/* ================= HOMEPAGE IMAGE 1 ================= */}
            <div className="group relative rounded-3xl overflow-hidden border-2 border-blue-900/20 bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col">
              {/* Header Label Bar */}
              <div className="px-5 py-3 bg-gradient-to-r from-blue-950 to-blue-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-yellow-400 text-blue-950 flex items-center justify-center text-[11px] font-black">
                    1
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-yellow-300">
                    Homepage Image 1
                  </span>
                </div>
                {image1 ? (
                  <span className="text-[10px] font-bold text-blue-200">
                    Official Church Sanctuary
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-blue-300/80 italic">
                    Placeholder
                  </span>
                )}
              </div>

              {/* Image View or Placeholder */}
              {image1 && (image1.url || image1.dataUrl) ? (
                <div
                  className="relative aspect-[16/10] overflow-hidden bg-gray-900 cursor-pointer"
                  onClick={() =>
                    setLightboxImage({
                      url: image1.url || image1.dataUrl || '',
                      title: image1.title || 'Sanctuary & Worship Area',
                      caption: image1.caption,
                      label: 'Homepage Image 1',
                    })
                  }
                  title="Click to enlarge photo"
                >
                  <img
                    src={image1.url || image1.dataUrl}
                    alt={image1.title || 'HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH - Sanctuary'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    loading="lazy"
                  />

                  {/* Hover Overlay with Enlarge Icon */}
                  <div className="absolute inset-0 bg-blue-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                    <span className="px-3.5 py-1.5 rounded-xl bg-white/95 text-blue-950 font-black text-xs flex items-center gap-1.5 shadow-md">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>View Full Image</span>
                    </span>
                  </div>

                  {/* Gradient Caption Overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-950/90 via-blue-950/60 to-transparent p-4 text-white">
                    <h3 className="font-black text-sm sm:text-base text-yellow-300 leading-snug drop-shadow-xs">
                      {image1.title || 'Sanctuary & Worship Area'}
                    </h3>
                    {image1.caption && (
                      <p className="text-xs text-blue-100 mt-0.5 line-clamp-2 drop-shadow-xs">
                        {image1.caption}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Clean, Dignified Placeholder (No Fake AI Photos, No Random Stock Pictures) */
                <div className="aspect-[16/10] p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-blue-950/5 via-blue-50 to-yellow-50/40 relative">
                  <div className="w-14 h-14 rounded-2xl bg-blue-900 text-yellow-400 flex items-center justify-center mb-3 shadow-md border-2 border-yellow-400/50">
                    <Church className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-blue-950">
                    Sanctuary & Worship Showcase
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                    Awaiting official church photograph. Uploaded by administrator via Admin Portal Settings.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-900/70 bg-white/80 px-2.5 py-0.5 rounded-full border border-blue-200">
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                    <span>HOUSE OF POWER • MANKESSIM</span>
                  </span>
                </div>
              )}
            </div>

            {/* ================= HOMEPAGE IMAGE 2 ================= */}
            <div className="group relative rounded-3xl overflow-hidden border-2 border-blue-900/20 bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col">
              {/* Header Label Bar */}
              <div className="px-5 py-3 bg-gradient-to-r from-blue-950 to-blue-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-yellow-400 text-blue-950 flex items-center justify-center text-[11px] font-black">
                    2
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-yellow-300">
                    Homepage Image 2
                  </span>
                </div>
                {image2 ? (
                  <span className="text-[10px] font-bold text-blue-200">
                    Fellowship & Ministries
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-blue-300/80 italic">
                    Placeholder
                  </span>
                )}
              </div>

              {/* Image View or Placeholder */}
              {image2 && (image2.url || image2.dataUrl) ? (
                <div
                  className="relative aspect-[16/10] overflow-hidden bg-gray-900 cursor-pointer"
                  onClick={() =>
                    setLightboxImage({
                      url: image2.url || image2.dataUrl || '',
                      title: image2.title || 'Church Ministries & Fellowship',
                      caption: image2.caption,
                      label: 'Homepage Image 2',
                    })
                  }
                  title="Click to enlarge photo"
                >
                  <img
                    src={image2.url || image2.dataUrl}
                    alt={image2.title || 'HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH - Fellowship'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    loading="lazy"
                  />

                  {/* Hover Overlay with Enlarge Icon */}
                  <div className="absolute inset-0 bg-blue-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                    <span className="px-3.5 py-1.5 rounded-xl bg-white/95 text-blue-950 font-black text-xs flex items-center gap-1.5 shadow-md">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>View Full Image</span>
                    </span>
                  </div>

                  {/* Gradient Caption Overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-950/90 via-blue-950/60 to-transparent p-4 text-white">
                    <h3 className="font-black text-sm sm:text-base text-yellow-300 leading-snug drop-shadow-xs">
                      {image2.title || 'Church Ministries & Fellowship'}
                    </h3>
                    {image2.caption && (
                      <p className="text-xs text-blue-100 mt-0.5 line-clamp-2 drop-shadow-xs">
                        {image2.caption}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Clean, Dignified Placeholder (No Fake AI Photos, No Random Stock Pictures) */
                <div className="aspect-[16/10] p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-blue-950/5 via-blue-50 to-yellow-50/40 relative">
                  <div className="w-14 h-14 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center mb-3 shadow-md border-2 border-blue-900/20">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-blue-950">
                    Fellowship & Ministries Showcase
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                    Awaiting official church photograph. Uploaded by administrator via Admin Portal Settings.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-900/70 bg-white/80 px-2.5 py-0.5 rounded-full border border-blue-200">
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                    <span>HOUSE OF POWER • MANKESSIM</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Two Main Portal Gateway Buttons */}
        <div className="mt-8 sm:mt-10 w-full grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Side 1: RECORD ATTENDANCE BOOK BUTTON */}
          <button
            type="button"
            onClick={onGoToAttendance}
            className="group relative flex flex-col items-center text-center p-7 sm:p-8 rounded-3xl bg-white border-2 border-blue-600 hover:border-yellow-400 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 touch-manipulation cursor-pointer overflow-hidden"
          >
            {/* Top gradient highlight strip */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-700 via-blue-900 to-indigo-900 group-hover:from-yellow-400 group-hover:to-yellow-500 transition-colors" />

            <div className="w-20 h-20 rounded-2xl bg-blue-900 text-yellow-300 flex items-center justify-center mb-5 group-hover:bg-yellow-400 group-hover:text-blue-950 group-hover:rotate-3 transition-all duration-300 shadow-md">
              <BookOpen className="w-10 h-10" />
            </div>

            <span className="text-lg sm:text-xl font-black text-blue-950 group-hover:text-blue-900 tracking-tight">
              RECORD ATTENDANCE BOOK
            </span>

            <p className="text-xs sm:text-sm text-gray-600 mt-2 font-medium leading-relaxed">
              Open the service register, mark roll call, use microphone voice search, and register first-time visitors.
            </p>

            {/* Feature badges */}
            <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 flex items-center gap-1">
                <Mic className="w-3 h-3 text-blue-600" /> Voice Search
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800">
                1-Touch Check-in
              </span>
            </div>

            {/* Action button indicator */}
            <div className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 group-hover:bg-yellow-400 text-yellow-300 group-hover:text-blue-950 font-extrabold text-xs sm:text-sm shadow-md transition-colors w-full justify-center">
              <span>Enter Record Attendance Book</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Side 2: ADMIN BUTTON */}
          <button
            type="button"
            onClick={onGoToAdmin}
            className="group relative flex flex-col items-center text-center p-7 sm:p-8 rounded-3xl bg-white border-2 border-yellow-400 hover:border-blue-900 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 touch-manipulation cursor-pointer overflow-hidden"
          >
            {/* Top gradient highlight strip */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 group-hover:from-blue-800 group-hover:to-blue-900 transition-colors" />

            <div className="w-20 h-20 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center mb-5 group-hover:bg-blue-900 group-hover:text-yellow-300 group-hover:-rotate-3 transition-all duration-300 shadow-md">
              <Shield className="w-10 h-10" />
            </div>

            <span className="text-lg sm:text-xl font-black text-blue-950 group-hover:text-blue-900 tracking-tight">
              ADMIN PORTAL
            </span>

            <p className="text-xs sm:text-sm text-gray-600 mt-2 font-medium leading-relaxed">
              Manage congregation registry, export attendance CSV spreadsheets, configure services, and update branding.
            </p>

            {/* Feature badges */}
            <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-600" /> {totalMembersCount} Members
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900">
                CSV Reports
              </span>
            </div>

            {/* Action button indicator */}
            <div className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 group-hover:bg-blue-900 text-blue-950 group-hover:text-yellow-300 font-extrabold text-xs sm:text-sm shadow-md transition-colors w-full justify-center">
              <span>Enter Admin Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* Lightbox Fullscreen Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-yellow-400"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-6 py-4 bg-blue-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                  {lightboxImage.label} • HOUSE OF POWER OF MINISTRY INT. CHURCH
                </span>
                <h4 className="text-base font-black text-white">{lightboxImage.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Photo */}
            <div className="p-4 bg-black flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Lightbox Caption */}
            {lightboxImage.caption && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-700 font-semibold text-center">
                &ldquo;{lightboxImage.caption}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
