import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show our custom UI
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // If the app is already installed, we shouldn't show it.
    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm"
        >
          <div className="bg-surface-card border border-nebula/30 p-4 rounded-2xl shadow-[0_0_20px_rgba(14,165,233,0.3)] flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-100 font-sans">Install Aplikasi</span>
              <span className="text-xs text-gray-400 font-sans">Tambahkan KITADETEKSI ke layar utama Anda untuk akses lebih cepat.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-nebula hover:bg-sky-500 text-white p-2.5 rounded-xl transition-colors shadow-lg glow-nebula-sm cursor-pointer"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="text-gray-500 hover:text-gray-300 p-2 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
