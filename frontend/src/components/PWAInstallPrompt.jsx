import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const PWAInstallPrompt = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installInstructions, setInstallInstructions] = useState([]);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = window.navigator.standalone === true;
    setIsStandalone(isInStandaloneMode || isInWebAppiOS);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check for a cached beforeinstallprompt event from App state
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Generate installation instructions based on device/browser
    const instructions = [];

    if (iOS) {
      instructions.push(
        'Tap the Share button in Safari',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to install SatoshiStop'
      );
    } else if (deferredPrompt) {
      instructions.push(
        'Click the "Install App" button below',
        'Or look for the install icon in your browser\'s address bar',
        'Follow the prompts to complete installation'
      );
    } else {
      instructions.push(
        'This app can be installed on your device',
        'Look for the install option in your browser menu',
        'Or use the "Add to Home Screen" option'
      );
    }

    setInstallInstructions(instructions);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {

      setDeferredPrompt(null);
      onClose();
    } else {

    }
  };

  const handleDismiss = () => {
    // Store dismissal in localStorage to avoid showing again
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    onClose();
  };

  if (isStandalone) {
    return null; // Don't show if already installed
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
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
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">₿</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Install SatoshiStop</h2>
                    <p className="text-blue-100">Get the full app experience</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Benefits */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Why install the app?
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-green-600 rounded-full" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Offline Access
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Browse and manage your collection without internet
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Push Notifications
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Get notified about bids, offers, and new drops
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-purple-600 rounded-full" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Faster Performance
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Native app-like speed and responsiveness
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <DevicePhoneMobileIcon className="w-3 h-3 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Home Screen Icon
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Easy access from your device's home screen
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Installation Instructions */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    How to install:
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3 mb-3">
                      {isIOS ? (
                        <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                      ) : (
                        <ComputerDesktopIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {isIOS ? 'iOS Installation' : 'Browser Installation'}
                        </p>
                      </div>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400 ml-8">
                      {installInstructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {deferredPrompt && !isIOS && (
                    <button
                      onClick={handleInstall}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      <span>Install App</span>
                    </button>
                  )}

                  <button
                    onClick={handleDismiss}
                    className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>

                {/* Footer Note */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    You can always install later from your browser menu
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;