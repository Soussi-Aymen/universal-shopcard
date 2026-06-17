import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  'Mobile Legends Diamonds gift card',
  'test gift card',
  'Going to Berlin, need an eSIM and a €25 ride to hotel',
];

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    if (!isLoading) {
      setPrompt(example);
      onSubmit(example);
    }
  };

  return (
    <div className="prompt-section">
      <div className="prompt-bar-container">
        <form onSubmit={handleSubmit} className="prompt-form">
          <input
            type="text"
            className="prompt-input"
            placeholder="Search Bitrefill — eSIM, gift card, game credits..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            className="prompt-submit-btn"
            disabled={!prompt.trim() || isLoading}
            aria-label="Submit intent prompt"
          >
            <ArrowRight size={20} />
          </button>
        </form>
      </div>

      <div className="prompt-examples">
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Sparkles size={14} style={{ color: 'var(--color-secondary)' }} /> Try:
        </span>
        {EXAMPLES.map((ex, idx) => (
          <button
            key={idx}
            className="example-tag"
            onClick={() => handleExampleClick(ex)}
            disabled={isLoading}
            type="button"
          >
            "{ex}"
          </button>
        ))}
      </div>
    </div>
  );
};
