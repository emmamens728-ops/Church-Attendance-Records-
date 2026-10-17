import React, { useState, useRef } from 'react';
import { X, Upload, Image, Trash2, Check, AlertCircle, Info } from 'lucide-react';
import { saveStoredLogo, clearStoredLogo, getStoredLogo } from '../utils/storage';

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoUploadModal: React.FC<LogoUploadModalProps> = ({ isOpen, onClose }) => {
  const [preview, setPreview] = useState<string | null>(getStoredLogo());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
    };
    reader.onerror = () => {
      setError('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!preview) {
      setError('No logo selected to save.');
      return;
    }
    saveStoredLogo(preview);
    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleReset = () => {
    clearStoredLogo();
    setPreview(null);
    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-blue-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-400 text-blue-950">
              <Upload className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Church Official Logo Branding</h2>
              <p className="text-xs text-blue-200">
                HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Logo Replacement:</span> Upload the official church
              logo graphic file (transparent PNG or SVG recommended). Once saved, it will
              immediately appear on the homepage, admin portal, and attendance records on all
              devices without rebuilding the application.
            </div>
          </div>

          {/* Preview Box */}
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/70">
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 p-2 rounded-2xl bg-white shadow-md ring-2 ring-yellow-400 flex items-center justify-center">
                  <img
                    src={preview}
                    alt="Uploaded Church Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ready to Apply
                </span>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-100/70 text-blue-800 flex items-center justify-center mb-2">
                  <Image className="w-10 h-10 stroke-1" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Currently using Default Official Crest</p>
                <p className="text-xs text-gray-500 mt-1">
                  Select your church logo image file below to replace it
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-blue-900 text-white hover:bg-blue-800 font-semibold text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Upload className="w-4 h-4 text-yellow-400" />
                {preview ? 'Select Different File' : 'Choose Logo Image'}
              </button>

              {preview && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-medium text-xs flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  Reset to Default
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Church logo successfully updated across all application screens!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!preview}
            className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-bold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
          >
            <Check className="w-4 h-4 font-bold" />
            Apply Official Logo
          </button>
        </div>
      </div>
    </div>
  );
};
