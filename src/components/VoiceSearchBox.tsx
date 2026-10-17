import React, { useState, useEffect } from 'react';
import {
  Search,
  Mic,
  MicOff,
  X,
  Loader2,
  AlertCircle,
  Volume2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

interface VoiceSearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  onSearch?: (val: string) => void;
  placeholder?: string;
  label?: string;
  sectionName?: 'ADMIN' | 'RECORD ATTENDANCE BOOK';
  className?: string;
}

export const VoiceSearchBox: React.FC<VoiceSearchBoxProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search member name, ID (e.g. HOP-MK-001), or phone...',
  sectionName,
  className = '',
}) => {
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);

  const handleTranscript = (transcript: string) => {
    // Normalise transcript (e.g., if speech recognition recognized "hop 001", normalize spaces or keep text)
    const cleaned = transcript.trim();
    onChange(cleaned);
    if (onSearch) {
      onSearch(cleaned);
    }
  };

  const {
    voiceState,
    isListening,
    isSupported,
    errorMessage,
    interimTranscript,
    startListening,
    stopListening,
    resetVoiceState,
    simulateVoiceInput,
  } = useVoiceSearch(handleTranscript);

  // If input changes while listening, sync
  const handleClear = () => {
    onChange('');
    if (onSearch) onSearch('');
    resetVoiceState();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Search Input Container */}
      <div className="relative">
        {/* Search icon */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-900/60">
          <Search className="w-5 h-5" />
        </div>

        {/* Input element */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening... Speak member name or ID now...' : placeholder}
          className={`w-full pl-11 pr-24 py-3 sm:py-3.5 bg-white border-2 rounded-2xl text-sm sm:text-base text-gray-900 placeholder:text-gray-400 font-medium transition-all duration-200 outline-none shadow-xs ${
            isListening
              ? 'border-red-500 ring-4 ring-red-100 bg-red-50/30'
              : voiceState === 'processing'
              ? 'border-yellow-400 ring-4 ring-yellow-100'
              : 'border-blue-200 hover:border-blue-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100'
          }`}
        />

        {/* Action icons on right: Clear (X) + Voice Microphone Button */}
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Voice Search Microphone Trigger */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`relative p-2.5 sm:p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center shadow-xs touch-manipulation active:scale-95 ${
              isListening
                ? 'bg-red-600 text-white ring-4 ring-red-300 animate-pulse'
                : voiceState === 'processing'
                ? 'bg-yellow-400 text-blue-950 ring-2 ring-yellow-200'
                : voiceState === 'error'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                : 'bg-blue-900 hover:bg-blue-800 text-yellow-300 hover:text-yellow-200 ring-1 ring-blue-700'
            }`}
            title={
              isListening
                ? 'Listening... Click to Stop'
                : 'Click or Tap to Speak & Search Member (Voice Input)'
            }
          >
            {isListening ? (
              <span className="relative flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-300"></span>
                </span>
              </span>
            ) : voiceState === 'processing' ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-950" />
            ) : !isSupported ? (
              <MicOff className="w-5 h-5 text-gray-400" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Voice Status & Live Feedback Strip */}
      {isListening && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs sm:text-sm text-red-800 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
            <span className="font-semibold text-red-900">Listening to voice:</span>
            <span className="italic text-red-700">
              {interimTranscript || 'Speak member name, ID or phone number...'}
            </span>
          </div>

          <button
            type="button"
            onClick={stopListening}
            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
          >
            Done
          </button>
        </div>
      )}

      {/* Processing State */}
      {voiceState === 'processing' && (
        <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-2 text-xs text-yellow-900 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-yellow-700" />
          <span>Converting speech to text and searching congregation records...</span>
        </div>
      )}

      {/* Error Feedback with quick dismiss / retry */}
      {voiceState === 'error' && errorMessage && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between text-xs text-amber-900">
          <div className="flex items-start gap-2 pr-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Microphone Voice Status</p>
              <p className="text-amber-800 mt-0.5">{errorMessage}</p>
              <p className="text-amber-700 mt-1 italic">
                You can still type normally into the search box above.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetVoiceState}
            className="text-amber-700 hover:text-amber-950 font-bold underline shrink-0 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Voice Assistant Assistance & Demo Samples */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-blue-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            Voice Search:
          </span>
          <span className="text-gray-600">
            Tap mic to speak (e.g. &ldquo;Pastor Mensah&rdquo;, &ldquo;Sarah&rdquo;, &ldquo;HOP-MK-005&rdquo;)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick simulation buttons to test voice search immediately even without mic access */}
          <span className="text-[11px] text-gray-400">Try Voice:</span>
          <button
            type="button"
            onClick={() => simulateVoiceInput('Emmanuel')}
            className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 hover:bg-yellow-400 hover:text-blue-950 font-medium text-[11px] transition-colors"
          >
            &ldquo;Emmanuel&rdquo;
          </button>
          <button
            type="button"
            onClick={() => simulateVoiceInput('HOP-MK-004')}
            className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 hover:bg-yellow-400 hover:text-blue-950 font-medium text-[11px] transition-colors"
          >
            &ldquo;HOP-MK-004&rdquo;
          </button>
          <button
            type="button"
            onClick={() => simulateVoiceInput('Grace')}
            className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 hover:bg-yellow-400 hover:text-blue-950 font-medium text-[11px] transition-colors"
          >
            &ldquo;Grace&rdquo;
          </button>

          <button
            type="button"
            onClick={() => setShowVoiceHelp(!showVoiceHelp)}
            className="p-1 text-gray-400 hover:text-blue-900"
            title="Voice Search Help & Privacy Info"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Voice Help Dropdown */}
      {showVoiceHelp && (
        <div className="mt-2 p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5 animate-in fade-in duration-150">
          <p className="font-bold flex items-center gap-1.5 text-blue-950">
            <Volume2 className="w-4 h-4 text-blue-700" />
            Voice Input Guidelines for {sectionName || 'Search'}:
          </p>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>
              <strong>Member Name:</strong> Speak first name, surname, or title (e.g. &ldquo;Sister Patricia&rdquo;, &ldquo;Deaconess Sarah&rdquo;, &ldquo;Quansah&rdquo;).
            </li>
            <li>
              <strong>Unique Member ID:</strong> Say the letters and number (e.g. &ldquo;H O P 001&rdquo; or &ldquo;HOP-MK-007&rdquo;).
            </li>
            <li>
              <strong>Phone Search:</strong> You can also speak the member&apos;s phone digits (e.g. &ldquo;0244123890&rdquo;).
            </li>
            <li>
              <strong>Microphone Privacy:</strong> Audio is processed solely via the standard browser Web Speech API during your search. No audio recordings are ever stored or transmitted elsewhere.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
