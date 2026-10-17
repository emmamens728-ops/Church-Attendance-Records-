import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  ShieldCheck,
  Info,
  Maximize2,
  FileImage,
  Sparkles,
} from 'lucide-react';
import { HomepageImageData, HomepageImagesConfig } from '../types';
import {
  uploadHomepageImageToServer,
  removeHomepageImageFromServer,
} from '../utils/storage';

interface HomepageImagesSettingsProps {
  homepageImages: HomepageImagesConfig;
  onUpdateImages: (updated: HomepageImagesConfig) => void;
  adminUsername?: string;
}

interface StagedImage {
  slot: 'image1' | 'image2';
  dataUrl: string;
  file: File;
  width: number;
  height: number;
  title: string;
  caption: string;
}

export const HomepageImagesSettings: React.FC<HomepageImagesSettingsProps> = ({
  homepageImages,
  onUpdateImages,
  adminUsername = 'Administrator',
}) => {
  // Staged images before clicking "Save Changes"
  const [stagedImage1, setStagedImage1] = useState<StagedImage | null>(null);
  const [stagedImage2, setStagedImage2] = useState<StagedImage | null>(null);

  // Loading and feedback states
  const [isSaving1, setIsSaving1] = useState(false);
  const [isSaving2, setIsSaving2] = useState(false);
  const [statusMessage1, setStatusMessage1] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [statusMessage2, setStatusMessage2] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Removal confirmation dialog state
  const [confirmRemovalSlot, setConfirmRemovalSlot] = useState<'image1' | 'image2' | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Full-size Preview Lightbox Modal
  const [previewModalImage, setPreviewModalImage] = useState<{
    url: string;
    title: string;
    slotName: string;
    width?: number;
    height?: number;
    caption?: string;
  } | null>(null);

  // Hidden file inputs
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // 1. File Selection & Client-Side Validation
  const handleFileSelect = (slot: 'image1' | 'image2', file: File) => {
    const setStatus = slot === 'image1' ? setStatusMessage1 : setStatusMessage2;
    setStatus(null);

    // Validate MIME type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(file.type.toLowerCase())) {
      setStatus({
        type: 'error',
        text: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.',
      });
      return;
    }

    // Validate file size: 8MB limit
    const MAX_BYTES = 8 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setStatus({
        type: 'error',
        text: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 8MB limit. Please select a smaller photo.`,
      });
      return;
    }

    // Read and validate image dimensions
    const reader = new FileReader();
    reader.onerror = () => {
      setStatus({
        type: 'error',
        text: 'Failed to read image file from your device. Please try again.',
      });
    };

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();

      img.onerror = () => {
        setStatus({
          type: 'error',
          text: 'The selected file is not a valid or readable image. Please choose another file.',
        });
      };

      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width < 200 || height < 200) {
          setStatus({
            type: 'error',
            text: `Image dimensions (${width}×${height}px) are too small. For best appearance, use at least 800×500px.`,
          });
          return;
        }

        const staged: StagedImage = {
          slot,
          dataUrl,
          file,
          width,
          height,
          title:
            slot === 'image1'
              ? 'Sanctuary & Worship Area'
              : 'Church Ministries & Fellowship',
          caption: '',
        };

        if (slot === 'image1') {
          setStagedImage1(staged);
        } else {
          setStagedImage2(staged);
        }

        setStatus({
          type: 'success',
          text: `Image selected and preview ready (${width}×${height}px, ${(file.size / 1024).toFixed(1)} KB). Click "Save Changes" to upload permanently.`,
        });
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  };

  // 2. Save Staged Changes to Server Persistent Storage
  const handleSaveChanges = async (slot: 'image1' | 'image2') => {
    const staged = slot === 'image1' ? stagedImage1 : stagedImage2;
    const setIsSaving = slot === 'image1' ? setIsSaving1 : setIsSaving2;
    const setStatus = slot === 'image1' ? setStatusMessage1 : setStatusMessage2;

    if (!staged) return;

    setIsSaving(true);
    setStatus(null);

    try {
      const savedRecord = await uploadHomepageImageToServer(slot, staged.dataUrl, {
        fileName: staged.file.name,
        fileSize: staged.file.size,
        width: staged.width,
        height: staged.height,
        title: staged.title.trim(),
        caption: staged.caption.trim(),
      });

      // Update parent state
      const updatedConfig = {
        ...homepageImages,
        [slot]: savedRecord,
      };
      onUpdateImages(updatedConfig);

      // Clear staged image
      if (slot === 'image1') {
        setStagedImage1(null);
      } else {
        setStagedImage2(null);
      }

      setStatus({
        type: 'success',
        text: `${slot === 'image1' ? 'Homepage Image 1' : 'Homepage Image 2'} has been verified and permanently saved! The homepage is now updated.`,
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        text: err.message || 'Failed to save image to persistent storage. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Remove Image with Confirmation
  const handleExecuteRemoval = async () => {
    if (!confirmRemovalSlot) return;

    const slot = confirmRemovalSlot;
    const setStatus = slot === 'image1' ? setStatusMessage1 : setStatusMessage2;
    setIsRemoving(true);

    try {
      await removeHomepageImageFromServer(slot);

      // Update parent state
      const updatedConfig = {
        ...homepageImages,
        [slot]: null,
      };
      onUpdateImages(updatedConfig);

      if (slot === 'image1') {
        setStagedImage1(null);
      } else {
        setStagedImage2(null);
      }

      setConfirmRemovalSlot(null);
      setStatus({
        type: 'success',
        text: `${slot === 'image1' ? 'Homepage Image 1' : 'Homepage Image 2'} removed successfully. The homepage will now show the clean placeholder.`,
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        text: err.message || 'Failed to remove image from server.',
      });
      setConfirmRemovalSlot(null);
    } finally {
      setIsRemoving(false);
    }
  };

  const renderImageSlotCard = (slot: 'image1' | 'image2') => {
    const isImage1 = slot === 'image1';
    const label = isImage1 ? 'Homepage Image 1' : 'Homepage Image 2';
    const currentSaved = isImage1 ? homepageImages.image1 : homepageImages.image2;
    const staged = isImage1 ? stagedImage1 : stagedImage2;
    const isSaving = isImage1 ? isSaving1 : isSaving2;
    const status = isImage1 ? statusMessage1 : statusMessage2;
    const fileInputRef = isImage1 ? fileInputRef1 : fileInputRef2;

    const activeDisplayUrl = staged ? staged.dataUrl : currentSaved?.url || currentSaved?.dataUrl;

    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-blue-200 shadow-md flex flex-col justify-between space-y-5">
        {/* Slot Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-900 text-yellow-300 flex items-center justify-center text-xs font-black">
                {isImage1 ? '1' : '2'}
              </span>
              <h4 className="text-base sm:text-lg font-black text-blue-950">{label}</h4>
              {currentSaved ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-black uppercase">
                  Empty Placeholder
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isImage1
                ? 'Primary church sanctuary, altar, or main worship hall showcase'
                : 'Congregation fellowship, praise & worship, or departmental activities'}
            </p>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-semibold text-gray-400">
              Accepted: JPG, PNG, WebP (Max 8MB)
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {status && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5 ${
              status.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-red-50 text-red-900 border border-red-300'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{status.text}</span>
          </div>
        )}

        {/* Live Preview Area */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50 aspect-[16/10] flex items-center justify-center group shadow-inner">
          {activeDisplayUrl ? (
            <>
              <img
                src={activeDisplayUrl}
                alt={label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              />

              {/* Staged Indicator Badge */}
              {staged && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-amber-400 text-blue-950 font-black text-xs shadow-md border border-amber-500 flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Staged Preview (Unsaved)</span>
                </div>
              )}

              {/* Image Quick Actions Overlay */}
              <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewModalImage({
                      url: activeDisplayUrl,
                      title: staged?.title || currentSaved?.title || label,
                      caption: staged?.caption || currentSaved?.caption,
                      slotName: label,
                      width: staged?.width || currentSaved?.width,
                      height: staged?.height || currentSaved?.height,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-white/95 text-blue-950 font-black text-xs flex items-center gap-1.5 shadow-md hover:bg-yellow-400 transition"
                  title="View enlarged image"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Enlarge Preview</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-400 space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center mx-auto border border-blue-200">
                <FileImage className="w-7 h-7" />
              </div>
              <p className="text-xs font-bold text-gray-700">No Image Uploaded Yet</p>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                The homepage currently displays the official church blue & gold crest placeholder.
              </p>
            </div>
          )}
        </div>

        {/* Current / Staged File Metadata */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl text-xs space-y-1">
          {staged ? (
            <div className="space-y-1 text-blue-950">
              <span className="font-black text-amber-800 uppercase tracking-wider text-[10px] block">
                Pending Staged File:
              </span>
              <p className="font-bold truncate text-blue-900">{staged.file.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-gray-600">
                <span>Size: {(staged.file.size / 1024).toFixed(1)} KB</span>
                <span>Dimensions: {staged.width} × {staged.height} px</span>
                <span>Format: {staged.file.type}</span>
              </div>
            </div>
          ) : currentSaved ? (
            <div className="space-y-1 text-blue-950">
              <span className="font-black text-emerald-800 uppercase tracking-wider text-[10px] block">
                Saved in Persistent Storage:
              </span>
              <p className="font-bold truncate text-blue-900">{currentSaved.fileName || 'homepage_image'}</p>
              <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-gray-600">
                {currentSaved.fileSize && (
                  <span>Size: {(currentSaved.fileSize / 1024).toFixed(1)} KB</span>
                )}
                {currentSaved.width && currentSaved.height && (
                  <span>Dimensions: {currentSaved.width} × {currentSaved.height} px</span>
                )}
                {currentSaved.uploadedAt && (
                  <span>
                    Uploaded: {new Date(currentSaved.uploadedAt).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-gray-500 italic">
              Select an image from your device to preview and save it to the church homepage.
            </div>
          )}
        </div>

        {/* Optional Title & Caption for Staged or Custom Label */}
        {staged && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Display Title (optional)
              </label>
              <input
                type="text"
                value={staged.title}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isImage1) {
                    setStagedImage1({ ...staged, title: val });
                  } else {
                    setStagedImage2({ ...staged, title: val });
                  }
                }}
                placeholder={isImage1 ? 'e.g. Main Sanctuary Auditorium' : 'e.g. Powerful Worship & Fellowship'}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-1 focus:ring-blue-600 outline-none"
                maxLength={80}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Brief Caption / Scripture Note (optional)
              </label>
              <input
                type="text"
                value={staged.caption}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isImage1) {
                    setStagedImage1({ ...staged, caption: val });
                  } else {
                    setStagedImage2({ ...staged, caption: val });
                  }
                }}
                placeholder="e.g. Empowered by the Holy Spirit • Psalm 96:6"
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-1 focus:ring-blue-600 outline-none"
                maxLength={150}
              />
            </div>
          </div>
        )}

        {/* Hidden native file input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelect(slot, file);
            }
            e.target.value = '';
          }}
        />

        {/* Action Controls */}
        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-gray-100">
          {staged ? (
            <>
              {/* Save Changes Button */}
              <button
                type="button"
                onClick={() => handleSaveChanges(slot)}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                <span>{isSaving ? 'Saving to Storage...' : 'Save Changes'}</span>
              </button>

              {/* Preview Image Button for staged image */}
              <button
                type="button"
                onClick={() =>
                  setPreviewModalImage({
                    url: staged.dataUrl,
                    title: staged.title || label,
                    caption: staged.caption,
                    slotName: label,
                    width: staged.width,
                    height: staged.height,
                  })
                }
                className="px-3.5 py-2.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-950 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-blue-900" />
                <span>Preview Image</span>
              </button>

              {/* Cancel Staged Selection */}
              <button
                type="button"
                onClick={() => {
                  if (isImage1) setStagedImage1(null);
                  else setStagedImage2(null);
                }}
                disabled={isSaving}
                className="px-3 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {/* Upload Image / Replace Image Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-yellow-400" />
                <span>{currentSaved ? 'Replace Image' : 'Upload Image'}</span>
              </button>

              {/* Preview Image Button */}
              {currentSaved && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewModalImage({
                      url: currentSaved.url || currentSaved.dataUrl || '',
                      title: currentSaved.title || label,
                      caption: currentSaved.caption,
                      slotName: label,
                      width: currentSaved.width,
                      height: currentSaved.height,
                    })
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-blue-900" />
                  <span>Preview Image</span>
                </button>
              )}

              {/* Remove Image Button */}
              {currentSaved && (
                <button
                  type="button"
                  onClick={() => setConfirmRemovalSlot(slot)}
                  className="px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Remove image and restore placeholder"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Remove Image</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Informational Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border-2 border-yellow-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center font-bold shadow-md shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-yellow-400 tracking-wider">
              Admin Portal • Homepage Customization
            </span>
            <h3 className="text-xl sm:text-2xl font-black">Homepage Image Management</h3>
            <p className="text-xs text-blue-200 mt-0.5">
              Control the two official showcase images displayed on the church homepage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-yellow-300 border border-white/20">
            Admin: {adminUsername}
          </span>
        </div>
      </div>

      {/* Guidelines Card */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-2">
        <div className="flex items-center gap-2 font-bold text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          <span>Image Guidelines & Security Safeguards:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-900/90 leading-relaxed">
          <li><strong>Persistent Server Storage:</strong> Uploaded images are permanently saved to disk in the church storage directory and database. They persist across browser reloads, device sign-outs, and multi-device access.</li>
          <li><strong>Homepage Protection:</strong> The public homepage automatically reflects your changes without any upload buttons or editable controls exposed to visitors.</li>
          <li><strong>Format & Limits:</strong> Supports JPEG, PNG, and WebP formats up to 8MB each. We recommend landscape photos (16:9 or 16:10 aspect ratio) for best appearance.</li>
          <li><strong>Safe Replacement:</strong> An existing image remains securely active on the homepage until a new image has been uploaded, verified, and saved successfully.</li>
        </ul>
      </div>

      {/* Two Image Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderImageSlotCard('image1')}
        {renderImageSlotCard('image2')}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {previewModalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-yellow-400">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-blue-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                  {previewModalImage.slotName} • Full Preview
                </span>
                <h4 className="text-base font-black text-white">{previewModalImage.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Display */}
            <div className="p-4 bg-black flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewModalImage.url}
                alt={previewModalImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-600 gap-2">
              <div>
                {previewModalImage.caption && (
                  <p className="font-semibold text-gray-800">&ldquo;{previewModalImage.caption}&rdquo;</p>
                )}
                {previewModalImage.width && previewModalImage.height && (
                  <p className="text-[11px] text-gray-500">
                    Dimensions: {previewModalImage.width} × {previewModalImage.height} pixels
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="px-4 py-2 rounded-xl bg-blue-900 text-yellow-300 font-bold text-xs hover:bg-blue-800 transition self-end sm:self-auto"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Image Removal */}
      {confirmRemovalSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-red-500 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-red-600 tracking-wider">
                Confirmation Required
              </span>
              <h4 className="text-lg font-black text-blue-950">
                Remove {confirmRemovalSlot === 'image1' ? 'Homepage Image 1' : 'Homepage Image 2'}?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed pt-1">
                The image will be permanently removed from persistent storage. The church homepage will revert to the clean official blue & gold placeholder until a new photo is uploaded.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmRemovalSlot(null)}
                disabled={isRemoving}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition"
              >
                Cancel — Keep Image
              </button>

              <button
                type="button"
                onClick={handleExecuteRemoval}
                disabled={isRemoving}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isRemoving ? 'Removing...' : 'Confirm Removal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
