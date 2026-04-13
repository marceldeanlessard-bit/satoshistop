import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceSearch = ({ isOpen, onClose, onSearch }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [volume, setVolume] = useState(0);

  const recognitionRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError('');
        startVolumeVisualization();
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        stopVolumeVisualization();
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        stopVolumeVisualization();
      };
    } else {
      setError('Speech recognition is not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopVolumeVisualization();
    };
  }, []);

  const startVolumeVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneRef.current = stream;

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(average / 255); // Normalize to 0-1

        animationRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {

    }
  };

  const stopVolumeVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setVolume(0);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError('');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleSearch = async () => {
    if (!transcript.trim()) return;

    setIsProcessing(true);
    try {
      // Process the voice search query
      await onSearch(transcript);
      onClose();
    } catch (error) {
      setError('Failed to process search. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && transcript.trim()) {
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Voice Search
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Voice Visualization */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative mb-4">
                    {/* Outer ring */}
                    <div className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                      {/* Inner circle with volume animation */}
                      <motion.div
                        className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center"
                        animate={{
                          scale: isListening ? 1 + volume * 0.3 : 1,
                          opacity: isListening ? 0.8 + volume * 0.2 : 1,
                        }}
                        transition={{ duration: 0.1 }}
                      >
                        {isProcessing ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isListening ? (
                          <StopIcon className="w-8 h-8 text-white" />
                        ) : (
                          <MicrophoneIcon className="w-8 h-8 text-white" />
                        )}
                      </motion.div>
                    </div>

                    {/* Pulsing rings */}
                    {isListening && (
                      <>
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-blue-400"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.6, 0, 0.6],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-purple-400"
                          animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.4, 0, 0.4],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5,
                          }}
                        />
                      </>
                    )}
                  </div>

                  {/* Status Text */}
                  <div className="text-center">
                    {isProcessing ? (
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Processing your search...
                      </p>
                    ) : isListening ? (
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Listening...
                      </p>
                    ) : (
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Tap to speak
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {isListening ? 'Say what you\'re looking for' : 'Search for products, categories, or sellers'}
                    </p>
                  </div>
                </div>

                {/* Transcript Display */}
                {transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-900 dark:text-white font-medium mb-1">
                        You said:
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 italic">
                        "{transcript}"
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-400 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!isListening && !isProcessing && (
                    <button
                      onClick={startListening}
                      disabled={!!error && error.includes('not supported')}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <MicrophoneIcon className="w-5 h-5" />
                      <span>Start Voice Search</span>
                    </button>
                  )}

                  {isListening && (
                    <button
                      onClick={stopListening}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <StopIcon className="w-5 h-5" />
                      <span>Stop Listening</span>
                    </button>
                  )}

                  {transcript && !isListening && !isProcessing && (
                    <button
                      onClick={handleSearch}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>Search for "{transcript.length > 20 ? transcript.substring(0, 20) + '...' : transcript}"</span>
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {/* Tips */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Voice Search Tips:
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Speak clearly and at a normal pace</li>
                    <li>• Try: "Show me vintage Bitcoin collectibles"</li>
                    <li>• Or: "Find digital art under $100"</li>
                    <li>• Press Escape or click Cancel to exit</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VoiceSearch;