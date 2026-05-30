import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Delete, Equal, Calculator as CalcIcon } from 'lucide-react';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDot = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const currentValue = prevValue || 0;
      let newValue = currentValue;

      switch (operator) {
        case '+': newValue = currentValue + inputValue; break;
        case '-': newValue = currentValue - inputValue; break;
        case '*': newValue = currentValue * inputValue; break;
        case '/': newValue = currentValue / inputValue; break;
      }
      setPrevValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const handleEqual = () => {
    const inputValue = parseFloat(display);
    if (operator && prevValue !== null) {
      let newValue = 0;
      switch (operator) {
        case '+': newValue = prevValue + inputValue; break;
        case '-': newValue = prevValue - inputValue; break;
        case '*': newValue = prevValue * inputValue; break;
        case '/': newValue = prevValue / inputValue; break;
      }
      setDisplay(String(newValue));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-24 right-8 z-[100] w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
              <CalcIcon size={16} />
              <span>ক্যালকুলেটর</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            <div className="bg-gray-900 text-white p-4 rounded-2xl mb-4 text-right overflow-hidden">
              <div className="text-xs text-gray-400 h-4 mb-1">
                {prevValue !== null && `${prevValue} ${operator || ''}`}
              </div>
              <div className="text-3xl font-bold truncate">
                {display}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button onClick={clear} className="col-span-2 p-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">AC</button>
              <button onClick={() => setDisplay(display.slice(0, -1) || '0')} className="p-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"><Delete size={20} className="mx-auto" /></button>
              <button onClick={() => performOperation('/')} className="p-4 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100">/</button>

              {[7, 8, 9].map(n => (
                <button key={n} onClick={() => inputDigit(String(n))} className="p-4 bg-gray-50 text-gray-800 font-bold rounded-xl hover:bg-gray-100">{n}</button>
              ))}
              <button onClick={() => performOperation('*')} className="p-4 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100">×</button>

              {[4, 5, 6].map(n => (
                <button key={n} onClick={() => inputDigit(String(n))} className="p-4 bg-gray-50 text-gray-800 font-bold rounded-xl hover:bg-gray-100">{n}</button>
              ))}
              <button onClick={() => performOperation('-')} className="p-4 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100">−</button>

              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => inputDigit(String(n))} className="p-4 bg-gray-50 text-gray-800 font-bold rounded-xl hover:bg-gray-100">{n}</button>
              ))}
              <button onClick={() => performOperation('+')} className="p-4 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100">+</button>

              <button onClick={() => inputDigit('0')} className="col-span-2 p-4 bg-gray-50 text-gray-800 font-bold rounded-xl hover:bg-gray-100">0</button>
              <button onClick={inputDot} className="p-4 bg-gray-50 text-gray-800 font-bold rounded-xl hover:bg-gray-100">.</button>
              <button onClick={handleEqual} className="p-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"><Equal size={20} className="mx-auto" /></button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
