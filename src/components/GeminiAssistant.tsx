import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Maximize2, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Product, Sale } from '../types';
import { Language, translations } from '../translations';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiAssistantProps {
  products: Product[];
  sales: Sale[];
  lang: Language;
  onAddProductDirectly?: (name: string, quantity: number) => void; // Function to directly increase stock in inventory
  onAddToCartDirectly?: (name: string, quantity: number) => void;    // Function to directly add to POS cart
}

export default function GeminiAssistant({ 
  products, 
  sales, 
  lang,
  onAddProductDirectly,
  onAddToCartDirectly 
}: GeminiAssistantProps) {
  const t = translations[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setMessages([
      { role: 'assistant', content: t.welcomeMessage }
    ]);

    // Web Speech API Configuration (Voice Dictation)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'bn-BD'; // Default Bengali input language
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setInput(speechToText);
      };
      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
      };
      recognitionRef.current = rec;
    }
  }, [lang, t.welcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(lang === 'bn' ? "দুঃখিত, আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। গুগল ক্রোম ব্যবহার করুন।" : "Sorry, your browser doesn't support Web Speech Voice API. Please use Google Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSend = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const userMessage = customInput || input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const inventorySummary = products.map(p => `${p.name} (Stock: ${p.stock}, Price: ${p.price})`).join(', ');

      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
          userMessage: userMessage,
          inventorySummary: inventorySummary,
          lang: lang,
        }),
      });

      if (!response.ok) {
        throw new Error('Server API failed to process request');
      }

      const result = await response.json();

      // Check if Gemini invoked any action/tools on the server
      if (result.functionCalls && result.functionCalls.length > 0) {
        const call = result.functionCalls[0];
        const args = call.args as any;

        if (call.name === 'add_product_to_inventory') {
          if (onAddProductDirectly) {
            onAddProductDirectly(args.productName, args.quantity);
          } else {
            // Dispatch dynamic window event for global integration decoupler
            window.dispatchEvent(new CustomEvent('add-to-inventory-direct', {
              detail: { productName: args.productName, quantity: args.quantity }
            }));
          }
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `✅ সফলভাবে ইনভেন্টরিতে পণ্য স্টক করা হয়েছে:\n📦 পণ্য: ${args.productName}\n🔢 পরিমাণ: ${args.quantity} টি।` 
          }]);
        } 
        else if (call.name === 'add_product_to_cart') {
          if (onAddToCartDirectly) {
            onAddToCartDirectly(args.productName, args.quantity);
          } else {
            // Dispatch dynamic window event which POS component listens to
            window.dispatchEvent(new CustomEvent('add-to-cart-direct', {
              detail: { productName: args.productName, quantity: args.quantity }
            }));
          }
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `🛒 বিক্রির রসিদে (POS Cart) পণ্য যুক্ত করা হয়েছে:\n🛍️ পণ্য: ${args.productName}\n🔢 পরিমাণ: ${args.quantity} টি।` 
          }]);
        }
      } else {
        const aiResponse = result.text || (lang === 'bn' ? "দুঃখিত, আমি বুঝতে পারিনি। আবার চেষ্টা করুন।" : "Sorry, I couldn't understand. Please try again.");
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      }

    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: lang === 'bn' ? "দুঃখিত, এআই প্রসেস করতে সমস্যা হচ্ছে। পরে চেষ্টা করুন।" : "Sorry, AI failed to process. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '64px' : '500px',
              width: isMinimized ? '200px' : '385px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 ring-1 ring-slate-200"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-none">{lang === 'bn' ? 'এ.আর স্মার্ট অ্যাসিস্ট্যান্ট' : 'A.R Smart Assistant'}</h4>
                  {!isMinimized && <p className="text-[10px] text-slate-400 mt-1">{lang === 'bn' ? 'ভয়েস দিয়ে দোকান চালান' : 'Run system using voice'}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages Body */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 custom-scrollbar">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("flex items-end gap-2 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white border text-indigo-600 shadow-sm")}>
                        {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                      </div>
                      <div className={cn("p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm whitespace-pre-line", msg.role === 'user' ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-slate-700 rounded-bl-none border border-slate-100")}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 mr-auto">
                      <div className="w-6 h-6 rounded-full bg-white border text-indigo-600 flex items-center justify-center shadow-sm">
                        <Bot size={12} />
                      </div>
                      <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-100 flex gap-1">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Bar with Voice Button */}
                <form onSubmit={(e) => handleSend(e)} className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all shadow-md shrink-0",
                      isListening ? "bg-red-500 animate-pulse animate-duration-1000" : "bg-slate-700 hover:bg-slate-800"
                    )}
                    title={lang === 'bn' ? "মুখে বলুন (বাংলা)" : "Speak now (English)"}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? (lang === 'bn' ? "আমি শুনছি, বলুন..." : "Listening, speak now...") : t.typeMessage}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button
                    disabled={!input.trim() || isLoading}
                    type="submit"
                    className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className={cn("w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500", isOpen ? "bg-indigo-600 text-white rotate-0" : "bg-black text-white hover:bg-slate-900")}
      >
        <MessageSquare size={24} />
      </motion.button>
    </div>
  );
}
