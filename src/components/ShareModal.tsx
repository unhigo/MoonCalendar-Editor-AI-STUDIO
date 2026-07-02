/**
 * Share calendar design and settings
 */

import React, { useState } from 'react';
import { Share2, Copy, Download, Loader, Check, X } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: any;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, state }) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState<'link' | 'json' | null>(null);

  if (!isOpen) return null;

  // Generate shareable config
  const configJson = JSON.stringify(state, null, 2);
  const configB64 = btoa(configJson);
  const shareUrl = `${window.location.origin}?config=${encodeURIComponent(configB64)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadConfig = () => {
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(configJson)
    );
    element.setAttribute('download', `moon-calendar-config-${new Date().getTime()}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShareToSocial = async (platform: 'twitter' | 'facebook') => {
    setSharing(platform as any);
    const text = `Check out my custom lunar calendar! 🌙`;
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    };

    window.open(urls[platform], 'share-window', 'width=600,height=400');
    setTimeout(() => setSharing(null), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 p-6 rounded-xl w-[500px] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-mono uppercase tracking-widest text-sm flex items-center gap-2">
            <Share2 size={16} /> Compartir Calendario
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Share Link */}
          <div>
            <label className="text-white/60 text-[10px] uppercase tracking-widest font-mono block mb-2">
              Enlace Compartible
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-white/70 text-[12px] font-mono truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition flex items-center gap-2"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* JSON Config */}
          <div>
            <label className="text-white/60 text-[10px] uppercase tracking-widest font-mono block mb-2">
              Configuración JSON
            </label>
            <textarea
              value={configJson}
              readOnly
              className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white/50 text-[10px] font-mono h-32 resize-none overflow-y-auto"
            />
            <button
              onClick={handleDownloadConfig}
              className="mt-2 w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition flex items-center justify-center gap-2 text-[12px]"
            >
              <Download size={14} /> Descargar Configuración
            </button>
          </div>

          {/* Social Share */}
          <div>
            <label className="text-white/60 text-[10px] uppercase tracking-widest font-mono block mb-2">
              Compartir en Redes
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleShareToSocial('twitter')}
                className="px-3 py-2 bg-[#1DA1F2] hover:bg-[#1a91da] rounded text-white transition text-[12px] font-mono disabled:opacity-50"
                disabled={sharing === 'twitter'}
              >
                {sharing === 'twitter' ? (
                  <>
                    <Loader size={14} className="inline animate-spin mr-1" />
                    Compartiendo...
                  </>
                ) : (
                  'Twitter/X'
                )}
              </button>
              <button
                onClick={() => handleShareToSocial('facebook')}
                className="px-3 py-2 bg-[#1877F2] hover:bg-[#166fe5] rounded text-white transition text-[12px] font-mono disabled:opacity-50"
                disabled={sharing === 'facebook'}
              >
                {sharing === 'facebook' ? (
                  <>
                    <Loader size={14} className="inline animate-spin mr-1" />
                    Compartiendo...
                  </>
                ) : (
                  'Facebook'
                )}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-white/5 border border-white/10 rounded p-3">
            <p className="text-[10px] text-white/60">
              💡 Tip: Comparte tu configuración con otros o carga configuraciones 
              previamente guardadas usando los enlaces generados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
