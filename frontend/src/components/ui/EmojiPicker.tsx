import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  position?: { top?: number; bottom?: number; left?: number; right?: number };
}

interface EmojiCategory {
  name: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Frequently Used',
    emojis: ['😀', '😃', '😄', '😊', '😍', '👍', '👎', '❤️', '😂', '😭', '🔥', '💯']
  },
  {
    name: 'Smileys & People',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏',
      '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
      '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
    ]
  },
  {
    name: 'Animals & Nature',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤',
      '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
      '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎'
    ]
  },
  {
    name: 'Food & Drink',
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭',
      '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕',
      '🧄', '🧅', '🥔', '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳',
      '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪'
    ]
  },
  {
    name: 'Activities',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓',
      '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
      '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️',
      '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺'
    ]
  },
  {
    name: 'Objects',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽',
      '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️',
      '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️',
      '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸'
    ]
  }
];

export default function EmojiPicker({ isOpen, onClose, onEmojiSelect, position }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    // Don't close picker - let user select multiple emojis
    // Picker only closes via close button or send message
  };

  const filteredEmojis = searchQuery
    ? EMOJI_CATEGORIES.flatMap(category => category.emojis).filter(emoji =>
        emoji.includes(searchQuery.toLowerCase())
      )
    : EMOJI_CATEGORIES[selectedCategory]?.emojis || [];

  const positionStyles = position ? {
    position: 'absolute' as const,
    ...position
  } : {
    position: 'fixed' as const,
    bottom: '60px',
    right: '20px'
  };

  return (
    <div
      ref={pickerRef}
      className="bg-background-tertiary border border-default rounded-lg shadow-2xl z-50 w-80 flex flex-col"
      style={{ ...positionStyles, height: '400px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-subtle flex-shrink-0">
        <h3 className="text-sm font-primary font-medium text-primary-text">Emoji Picker</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-background-secondary transition-colors"
        >
          <X className="w-4 h-4 text-secondary-text" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-subtle flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-text" />
          <input
            type="text"
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base w-full pl-10 text-sm font-primary"
          />
        </div>
      </div>

      {/* Categories */}
      {!searchQuery && (
        <div className="flex overflow-x-auto border-b border-subtle flex-shrink-0">
          {EMOJI_CATEGORIES.map((category, index) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(index)}
              className={`flex-shrink-0 px-3 py-2 text-xs font-primary font-medium transition-colors ${
                selectedCategory === index
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-secondary-text hover:text-primary-text'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => handleEmojiClick(emoji)}
              className="p-2 rounded-lg hover:bg-background-secondary transition-colors text-lg"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {filteredEmojis.length === 0 && searchQuery && (
          <div className="text-center py-8 text-secondary-text">
            <span className="text-2xl">🤔</span>
            <p className="mt-2 text-sm font-primary">No emojis found</p>
          </div>
        )}
      </div>
    </div>
  );
}