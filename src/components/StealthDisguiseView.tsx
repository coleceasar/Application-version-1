/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, Delete, ShieldAlert } from 'lucide-react';

interface StealthDisguiseViewProps {
  onUnlock: () => void;
  secretPasskey?: string; // default "1234=" or "9070="
}

export const StealthDisguiseView: React.FC<StealthDisguiseViewProps> = ({
  onUnlock,
  secretPasskey = '1234',
}) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isCalculated, setIsCalculated] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleNumber = (digit: string) => {
    if (display === '0' || isCalculated) {
      setDisplay(digit);
      setIsCalculated(false);
    } else {
      setDisplay(display + digit);
    }
  };

  const handleOp = (op: string) => {
    setIsCalculated(false);
    setEquation(`${display} ${op} `);
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleEqual = () => {
    // Check if entered code matches secret passkey
    if (display === secretPasskey || display === '1234' || display === '9070') {
      onUnlock();
      return;
    }

    try {
      const fullExp = equation + display;
      // Sanitize equation to only digits and math operators
      const cleanExp = fullExp.replace(/[^0-9+\-*/.]/g, '');
      // Evaluate simple math
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${cleanExp})`)();
      setDisplay(String(result));
      setEquation('');
      setIsCalculated(true);
    } catch {
      setDisplay('Error');
      setEquation('');
    }
  };

  return (
    <div
      id="stealth-calculator-disguise"
      className="w-full h-full bg-neutral-950 text-neutral-100 flex flex-col justify-between p-4 sm:p-6 select-none font-sans"
    >
      {/* Top stealth bar */}
      <div className="flex items-center justify-between pt-2 pb-4 text-neutral-500 text-xs">
        <span className="font-mono text-neutral-400">Calculator</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="text-[10px] text-neutral-600 hover:text-neutral-400"
          >
            {showHint ? 'Secret: Type 1234 and =' : 'RAD'}
          </button>
          <button
            id="stealth-emergency-unmask-btn"
            type="button"
            onClick={onUnlock}
            className="w-7 h-7 rounded-full hover:bg-neutral-900 flex items-center justify-center text-neutral-600 hover:text-teal-400 transition-colors"
            title="Double-tap to unhide F& E"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Calculator Display Screen */}
      <div className="flex-1 flex flex-col justify-end px-2 py-6 text-right">
        <div className="text-sm font-mono text-neutral-500 h-6 overflow-hidden">
          {equation}
        </div>
        <div className="text-4xl sm:text-5xl font-mono font-light text-white tracking-tight break-all">
          {display}
        </div>
      </div>

      {/* Calculator Keypad */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3 pb-4">
        <button
          type="button"
          onClick={handleClear}
          className="h-14 sm:h-16 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-teal-400 font-medium text-lg active:scale-95 transition-transform"
        >
          AC
        </button>
        <button
          type="button"
          onClick={() => {
            if (display.startsWith('-')) setDisplay(display.substring(1));
            else if (display !== '0') setDisplay('-' + display);
          }}
          className="h-14 sm:h-16 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-lg active:scale-95 transition-transform"
        >
          +/-
        </button>
        <button
          type="button"
          onClick={() => {
            const num = parseFloat(display);
            setDisplay(String(num / 100));
          }}
          className="h-14 sm:h-16 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-lg active:scale-95 transition-transform"
        >
          %
        </button>
        <button
          type="button"
          onClick={() => handleOp('/')}
          className="h-14 sm:h-16 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white font-medium text-xl active:scale-95 transition-transform"
        >
          ÷
        </button>

        {['7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleNumber(d)}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-100 font-medium text-xl active:scale-95 transition-transform"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOp('*')}
          className="h-14 sm:h-16 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white font-medium text-xl active:scale-95 transition-transform"
        >
          ×
        </button>

        {['4', '5', '6'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleNumber(d)}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-100 font-medium text-xl active:scale-95 transition-transform"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOp('-')}
          className="h-14 sm:h-16 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white font-medium text-xl active:scale-95 transition-transform"
        >
          −
        </button>

        {['1', '2', '3'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleNumber(d)}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-100 font-medium text-xl active:scale-95 transition-transform"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOp('+')}
          className="h-14 sm:h-16 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white font-medium text-xl active:scale-95 transition-transform"
        >
          +
        </button>

        <button
          type="button"
          onClick={() => handleNumber('0')}
          className="col-span-2 h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-100 font-medium text-xl active:scale-95 transition-transform pl-6 text-left"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => {
            if (!display.includes('.')) setDisplay(display + '.');
          }}
          className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-100 font-medium text-xl active:scale-95 transition-transform"
        >
          .
        </button>
        <button
          id="stealth-equal-unlock-btn"
          type="button"
          onClick={handleEqual}
          className="h-14 sm:h-16 rounded-2xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-2xl active:scale-95 transition-transform shadow-lg shadow-teal-500/30"
        >
          =
        </button>
      </div>
    </div>
  );
};
