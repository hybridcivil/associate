import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Maximize2,
  AlertCircle,
  Wand2,
  CheckCircle2,
  Layers,
  Ratio,
  Maximize,
  X,
} from 'lucide-react';

export const ImageGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);

  // Gallery of generated images
  const [gallery, setGallery] = useState<GeneratedImage[]>([
    {
      id: 'default-img-1',
      url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861564?auto=format&fit=crop&w=1200&q=80',
      prompt: 'Modern civil engineering structural foundation construction site with reinforced concrete rebars and surveying gear',
      size: '2K',
      aspectRatio: '16:9',
      timestamp: 'Sample Visualization',
    },
    {
      id: 'default-img-2',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      prompt: 'G+9 commercial skyscraper structural elevation with high-performance glass curtain wall and cantilever canopy',
      size: '1K',
      aspectRatio: '1:1',
      timestamp: 'Sample Visualization',
    },
  ]);

  const presetPrompts = [
    'Modern 8-story commercial complex architectural 3D render with cantilever balconies and solar glass canopy',
    'Civil engineering raft foundation cross-section with high-strength deformed rebar layout and grade beam detailing',
    'Geotechnical soil testing borehole drilling rig operated by certified civil engineers with standard penetration test equipment',
    'Architectural concept drawing of a modern highway overpass bridge with prestressed concrete girders and pier caps',
  ];

  const handleGenerate = async (customPrompt?: string) => {
    const text = customPrompt || prompt;
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text.trim(),
          size,
          aspectRatio,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate image with Gemini model.');
      }

      const newImage: GeneratedImage = {
        id: 'img-' + Date.now(),
        url: data.imageUrl,
        prompt: text.trim(),
        size: data.size || size,
        aspectRatio: data.aspectRatio || aspectRatio,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setGallery((prev) => [newImage, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          'Failed to render image. Ensure your GEMINI_API_KEY supports image generation models.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const a = document.createElement('a');
    a.href = img.url;
    a.download = `hybrid-civil-${img.size}-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#10243a] flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-orange-500" />
            AI Structural & Architectural Visualizer
          </h2>
          <p className="text-xs text-slate-500">
            Render high-fidelity civil engineering mockups powered by Gemini (gemini-3-pro-image-preview)
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <Layers className="w-3.5 h-3.5 text-[#f28c28]" />
          <span>Configurable Resolution: 1K · 2K · 4K</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Generator Studio Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Civil Engineering / Architectural Prompt *
          </label>
          <textarea
            id="imagePromptInput"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the structural design, foundation detail, building elevation, or construction site in detail..."
            className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white leading-relaxed"
          />
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">
            Presets:
          </span>
          {presetPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setPrompt(p);
                handleGenerate(p);
              }}
              className="text-[10.5px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <Sparkles className="w-3 h-3 text-orange-500" />
              <span className="max-w-[240px] truncate">{p}</span>
            </button>
          ))}
        </div>

        {/* Settings Bar: Size (1K, 2K, 4K) & Aspect Ratio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          {/* User Affordance: Resolution Selection */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <Maximize className="w-3 h-3 text-orange-500" />
              <span>Output Resolution (Affordance)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['1K', '2K', '4K'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  id={`image-size-${sz}`}
                  onClick={() => setSize(sz)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    size === sz
                      ? 'bg-[#10243a] text-white border-[#10243a] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sz}
                  <span className="block text-[9px] font-normal opacity-80">
                    {sz === '1K'
                      ? '1024 px'
                      : sz === '2K'
                      ? '2048 px'
                      : '4096 px'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <Ratio className="w-3 h-3 text-orange-500" />
              <span>Aspect Ratio</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '1:1', sub: 'Square' },
                { label: '16:9', sub: 'Blueprint' },
                { label: '4:3', sub: 'Standard' },
                { label: '9:16', sub: 'Mobile' },
              ].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setAspectRatio(r.label)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    aspectRatio === r.label
                      ? 'bg-[#f28c28] text-white border-[#f28c28] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.label}
                  <span className="block text-[9px] font-normal opacity-80">
                    {r.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-2">
          <button
            id="generateImageBtn"
            onClick={() => handleGenerate()}
            disabled={!prompt.trim() || isLoading}
            className="w-full py-2.5 rounded-lg bg-[#f28c28] hover:bg-[#e07f20] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating {size} Structural Visualization...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate High-Quality Image ({size} · gemini-3-pro-image-preview)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
            Generated Concept Visualizations ({gallery.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            Click any render to preview full resolution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {gallery.map((img) => (
            <div
              key={img.id}
              className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs transition-all hover:shadow-md"
            >
              <div
                className="w-full aspect-video bg-cover bg-center cursor-pointer transition-transform duration-300 group-hover:scale-102"
                style={{ backgroundImage: `url(${img.url})` }}
                onClick={() => setLightboxImage(img)}
              />

              {/* Overlay Badges */}
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold">
                  {img.size}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#f28c28]/90 text-white text-[10px] font-semibold">
                  {img.aspectRatio}
                </span>
              </div>

              {/* Footer info & actions */}
              <div className="p-2.5 bg-white border-t border-slate-100 flex items-start justify-between gap-2">
                <p className="text-[11px] text-slate-700 line-clamp-2 leading-snug">
                  {img.prompt}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setLightboxImage(img)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="View Full Size"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(img)}
                    className="p-1 rounded bg-orange-100 hover:bg-orange-200 text-orange-800 transition-colors"
                    title="Download Image"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-black/50 flex items-center justify-between text-white border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-orange-500 font-bold text-xs">
                  {lightboxImage.size} Resolution
                </span>
                <span className="text-xs text-slate-300">
                  {lightboxImage.aspectRatio}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(lightboxImage)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-2 flex items-center justify-center bg-black/80 max-h-[75vh] overflow-hidden">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.prompt}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="p-3 bg-slate-900 text-slate-200 text-xs border-t border-white/10">
              <span className="font-semibold text-white">Prompt: </span>
              {lightboxImage.prompt}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
