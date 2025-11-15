import React, { useState } from 'react';

export type BackgroundEffect = 'none' | 'blur' | 'gradient';

export interface GradientConfig {
  type: 'linear' | 'radial';
  angle?: number; // 0-360 for linear
  color1: string;
  color2: string;
  color3?: string;
}

interface BackgroundEffectsModalProps {
  onClose: () => void;
  onApply: (effect: BackgroundEffect, gradientConfig?: GradientConfig) => void;
  currentEffect: BackgroundEffect;
  currentGradient?: GradientConfig;
}

const PRESET_GRADIENTS: GradientConfig[] = [
  {
    type: 'linear',
    angle: 45,
    color1: '#667eea',
    color2: '#764ba2',
  },
  {
    type: 'linear',
    angle: 135,
    color1: '#f093fb',
    color2: '#f5576c',
  },
  {
    type: 'linear',
    angle: 90,
    color1: '#4facfe',
    color2: '#00f2fe',
  },
  {
    type: 'radial',
    color1: '#fa709a',
    color2: '#fee140',
  },
  {
    type: 'linear',
    angle: 45,
    color1: '#30cfd0',
    color2: '#330867',
  },
  {
    type: 'linear',
    angle: 180,
    color1: '#a8edea',
    color2: '#fed6e3',
  },
];

const generateGradientCSS = (config: GradientConfig): string => {
  if (config.type === 'linear') {
    return `linear-gradient(${config.angle}deg, ${config.color1}, ${config.color2})`;
  } else {
    return `radial-gradient(circle, ${config.color1}, ${config.color2})`;
  }
};

const BackgroundEffectsModal: React.FC<BackgroundEffectsModalProps> = ({
  onClose,
  onApply,
  currentEffect,
  currentGradient,
}) => {
  const [selectedEffect, setSelectedEffect] = useState<BackgroundEffect>(currentEffect);
  const [customGradient, setCustomGradient] = useState<GradientConfig>(
    currentGradient || {
      type: 'linear',
      angle: 45,
      color1: '#667eea',
      color2: '#764ba2',
    }
  );

  const handleApply = () => {
    if (selectedEffect === 'gradient') {
      onApply('gradient', customGradient);
    } else {
      onApply(selectedEffect);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface rounded-lg shadow-xl p-6 w-full max-w-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-text-secondary hover:text-white text-2xl"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-6 text-dark-text-primary">Background Effects</h2>

        <div className="space-y-6 overflow-y-auto pr-2">
          {/* Effect Selection */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-4">
              Choose Background Effect
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* No Background */}
              <button
                onClick={() => setSelectedEffect('none')}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  selectedEffect === 'none'
                    ? 'border-brand-secondary bg-blue-900 bg-opacity-20'
                    : 'border-dark-border hover:border-brand-secondary'
                }`}
              >
                <div className="text-3xl mb-2">🚫</div>
                <div className="font-semibold text-dark-text-primary">None</div>
                <div className="text-xs text-dark-text-secondary">Show real background</div>
              </button>

              {/* Blur Background */}
              <button
                onClick={() => setSelectedEffect('blur')}
                className={`p-4 rounded-lg border-2 transition-all text-center overflow-hidden ${
                  selectedEffect === 'blur'
                    ? 'border-brand-secondary bg-blue-900 bg-opacity-20'
                    : 'border-dark-border hover:border-brand-secondary'
                }`}
              >
                <div
                  className="text-3xl mb-2 backdrop-blur-md inline-block"
                  style={{ backdropFilter: 'blur(8px)' }}
                >
                  🌫️
                </div>
                <div className="font-semibold text-dark-text-primary">Blur</div>
                <div className="text-xs text-dark-text-secondary">Blur your background</div>
              </button>

              {/* Gradient Background */}
              <button
                onClick={() => setSelectedEffect('gradient')}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  selectedEffect === 'gradient'
                    ? 'border-brand-secondary bg-blue-900 bg-opacity-20'
                    : 'border-dark-border hover:border-brand-secondary'
                }`}
              >
                <div
                  className="text-3xl mb-2 inline-block px-4 py-2 rounded text-white"
                  style={{
                    background: generateGradientCSS(customGradient),
                  }}
                >
                  🎨
                </div>
                <div className="font-semibold text-dark-text-primary">Gradient</div>
                <div className="text-xs text-dark-text-secondary">Custom gradient</div>
              </button>
            </div>
          </div>

          {/* Gradient Customization */}
          {selectedEffect === 'gradient' && (
            <div className="space-y-4 bg-dark-border rounded-lg p-4">
              <h3 className="font-semibold text-dark-text-primary">Gradient Settings</h3>

              {/* Gradient Type */}
              <div>
                <label className="text-sm font-medium text-dark-text-secondary mb-2 block">
                  Gradient Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCustomGradient({
                        ...customGradient,
                        type: 'linear',
                      })
                    }
                    className={`flex-1 py-2 rounded transition-colors ${
                      customGradient.type === 'linear'
                        ? 'bg-brand-secondary text-white'
                        : 'bg-dark-surface text-dark-text-secondary hover:bg-dark-border'
                    }`}
                  >
                    Linear
                  </button>
                  <button
                    onClick={() =>
                      setCustomGradient({
                        ...customGradient,
                        type: 'radial',
                      })
                    }
                    className={`flex-1 py-2 rounded transition-colors ${
                      customGradient.type === 'radial'
                        ? 'bg-brand-secondary text-white'
                        : 'bg-dark-surface text-dark-text-secondary hover:bg-dark-border'
                    }`}
                  >
                    Radial
                  </button>
                </div>
              </div>

              {/* Angle (Linear only) */}
              {customGradient.type === 'linear' && (
                <div>
                  <label htmlFor="angle" className="text-sm font-medium text-dark-text-secondary mb-2 block">
                    Angle: {customGradient.angle}°
                  </label>
                  <input
                    id="angle"
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={customGradient.angle || 0}
                    onChange={(e) =>
                      setCustomGradient({
                        ...customGradient,
                        angle: parseInt(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-dark-surface rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              {/* Color 1 */}
              <div>
                <label htmlFor="color1" className="text-sm font-medium text-dark-text-secondary mb-2 block">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    id="color1"
                    type="color"
                    value={customGradient.color1}
                    onChange={(e) =>
                      setCustomGradient({
                        ...customGradient,
                        color1: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customGradient.color1}
                    onChange={(e) =>
                      setCustomGradient({
                        ...customGradient,
                        color1: e.target.value,
                      })
                    }
                    className="flex-1 bg-dark-surface border border-dark-border rounded px-3 py-2 text-dark-text-primary text-sm font-mono"
                  />
                </div>
              </div>

              {/* Color 2 */}
              <div>
                <label htmlFor="color2" className="text-sm font-medium text-dark-text-secondary mb-2 block">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    id="color2"
                    type="color"
                    value={customGradient.color2}
                    onChange={(e) =>
                      setCustomGradient({
                        ...customGradient,
                        color2: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customGradient.color2}
                    onChange={(e) =>
                      setCustomGradient({
                        ...customGradient,
                        color2: e.target.value,
                      })
                    }
                    className="flex-1 bg-dark-surface border border-dark-border rounded px-3 py-2 text-dark-text-primary text-sm font-mono"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4">
                <p className="text-sm font-medium text-dark-text-secondary mb-2">Preview</p>
                <div
                  className="w-full h-32 rounded-lg border border-dark-border"
                  style={{
                    background: generateGradientCSS(customGradient),
                  }}
                />
              </div>

              {/* Preset Gradients */}
              <div>
                <p className="text-sm font-medium text-dark-text-secondary mb-2">Presets</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_GRADIENTS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCustomGradient(preset)}
                      className="h-12 rounded-lg border-2 border-dark-border hover:border-brand-secondary transition-colors"
                      style={{
                        background: generateGradientCSS(preset),
                      }}
                      title={`Preset ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Blur Settings */}
          {selectedEffect === 'blur' && (
            <div className="bg-dark-border rounded-lg p-4">
              <p className="text-sm text-dark-text-secondary">
                The blur effect will obscure your background while keeping you visible. This is perfect for
                professional meetings when you don't want to show your surroundings.
              </p>
            </div>
          )}

          {/* None Settings */}
          {selectedEffect === 'none' && (
            <div className="bg-dark-border rounded-lg p-4">
              <p className="text-sm text-dark-text-secondary">
                Your real background will be visible. Make sure your surroundings are appropriate for your meeting.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-dark-border text-dark-text-primary hover:bg-dark-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 rounded-lg bg-brand-secondary hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundEffectsModal;
