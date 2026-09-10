/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus } from 'lucide-react';

interface MessageReactionPickerProps {
  onSelectReaction: (emoji: string) => void;
  onOpenFullPicker?: () => void;
  onClose: () => void;
  isSelf: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '🔐'];

export const MessageReactionPicker: React.FC<MessageReactionPickerProps> = ({
  onSelectReaction,
  onOpenFullPicker,
  onClose,
  isSelf,
}) => {
  return (
    <div
      id="message-quick-reaction-bar"
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-30 -top-11 flex items-center gap-0.5 p-1 bg-neutral-900 border border-neutral-700/80 rounded-full shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-100 ${
        isSelf ? 'right-2' : 'left-2'
      }`}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelectReaction(emoji);
            onClose();
          }}
          className="w-8 h-8 rounded-full hover:bg-neutral-800 flex items-center justify-center text-lg transition-transform hover:scale-130 active:scale-95 cursor-pointer"
          title={emoji}
        >
          {emoji}
        </button>
      ))}

      {onOpenFullPicker && (
        <button
          type="button"
          onClick={() => {
            onOpenFullPicker();
            onClose();
          }}
          className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer ml-0.5"
          title="More reactions"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
