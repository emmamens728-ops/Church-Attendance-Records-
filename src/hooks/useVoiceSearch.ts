import { useState, useRef, useEffect, useCallback } from 'react';
import { VoiceState } from '../types';

// SpeechRecognition type declarations for browsers
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseVoiceSearchResult {
  voiceState: VoiceState;
  isListening: boolean;
  isSupported: boolean;
  errorMessage: string | null;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetVoiceState: () => void;
  simulateVoiceInput: (testPhrase?: string) => void;
}

export const useVoiceSearch = (
  onTranscriptComplete: (transcript: string) => void
): UseVoiceSearchResult => {
  const [voiceState, setVoiceState] = useState<VoiceState>('ready');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const transcriptBufferRef = useRef<string>('');

  useEffect(() => {
    try {
      const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
      const SpeechRecognitionClass = win ? (win.SpeechRecognition || win.webkitSpeechRecognition) : null;

      if (!SpeechRecognitionClass) {
        setIsSupported(false);
        setVoiceState('unsupported');
      }
    } catch {
      setIsSupported(false);
      setVoiceState('unsupported');
    }
  }, []);

  const resetVoiceState = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    setVoiceState((prev) => (prev === 'unsupported' ? 'unsupported' : 'ready'));
    setErrorMessage(null);
    setInterimTranscript('');
    transcriptBufferRef.current = '';
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const startListening = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setVoiceState('unsupported');
      setErrorMessage(
        'Speech recognition is not supported in this browser. Please use keyboard search or Chrome on Android/Desktop.'
      );
      return;
    }

    // Reset previous session
    setErrorMessage(null);
    setInterimTranscript('');
    transcriptBufferRef.current = '';

    try {
      // Create new instance
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US'; // English (widely compatible in Ghana & international churches)

      recognition.onstart = () => {
        setVoiceState('listening');
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTrans += item[0].transcript;
          } else {
            interimTrans += item[0].transcript;
          }
        }

        if (interimTrans) {
          setInterimTranscript(interimTrans);
        }

        if (finalTrans) {
          transcriptBufferRef.current = finalTrans.trim();
          setInterimTranscript(finalTrans.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setVoiceState('error');

        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            setErrorMessage(
              'Microphone access was denied. Please allow microphone permissions in your browser address bar to use voice search.'
            );
            break;
          case 'no-speech':
            setErrorMessage(
              'No speech detected. Please tap the microphone and speak clearly into your device.'
            );
            break;
          case 'audio-capture':
            setErrorMessage('No microphone was found or microphone is busy.');
            break;
          case 'network':
            setErrorMessage(
              'Network error during voice processing. Standard Web Speech requires an active connection.'
            );
            break;
          default:
            setErrorMessage(`Voice search error: ${event.error || 'Please try again.'}`);
        }
      };

      recognition.onend = () => {
        const result = transcriptBufferRef.current;
        if (result) {
          setVoiceState('processing');
          setTimeout(() => {
            onTranscriptComplete(result);
            setVoiceState('ready');
            setInterimTranscript('');
          }, 350);
        } else {
          // If ended with no text and no error already reported
          setVoiceState((prev) => (prev === 'error' ? 'error' : 'ready'));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setVoiceState('error');
      setErrorMessage(
        'Could not start microphone. Please check permissions or type your search query.'
      );
    }
  }, [onTranscriptComplete]);

  // Simulation mode for quick testing or environments where speech recognition is unavailable
  const simulateVoiceInput = useCallback(
    (testPhrase = 'Emmanuel') => {
      setVoiceState('listening');
      setErrorMessage(null);
      setInterimTranscript('Listening: "' + testPhrase + '"...');

      setTimeout(() => {
        setVoiceState('processing');
        setInterimTranscript(testPhrase);

        setTimeout(() => {
          onTranscriptComplete(testPhrase);
          setVoiceState('ready');
          setInterimTranscript('');
        }, 400);
      }, 900);
    },
    [onTranscriptComplete]
  );

  return {
    voiceState,
    isListening: voiceState === 'listening',
    isSupported,
    errorMessage,
    interimTranscript,
    startListening,
    stopListening,
    resetVoiceState,
    simulateVoiceInput,
  };
};
