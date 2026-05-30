import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';
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
}

export default function GeminiAssistant({ products, sales, lang }: GeminiAssistantProps) {
  const t = translations[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      { role: 'assistant', content: t.welcomeMessage }
    ]);
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const inventorySummary = products.length > 0 
        ? products.map(p => `${p.name} (${lang === 'bn' ? 'স্টক' : 'Stock'}: ${p.stock}, ${lang === 'bn' ? 'দাম' : 'Price'}: ${p.price})`).join(', ')
        : (lang === 'bn' ? "দোকানে এখনও কোনো মালামাল নেই।" : "No items in shop yet.");
      
      const salesSummary = sales.length > 0
        ? sales.slice(0, 5).map(s => `${s.customerName || (lang === 'bn' ? 'বেনামী কাস্টমার' : 'Anonymous')} - ${s.payableAmount} ${lang === 'bn' ? 'টাকা' : 'TK'}`).join(', ')
        : (lang === 'bn' ? "এখনও কোনো বিক্রি হয়নি।" : "No sales yet.");

      const systemPrompt = `
        You are a Helpful Store Assistant for an Electronics Shop POS system named "Electronics Corner".
        
        Inventory Context: ${inventorySummary}
        Recent Sales: ${salesSummary}
        Today's Date: ${new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}
        
        Rules:
        1. Always respond in ${lang === 'bn' ? 'BENGALI' : 'ENGLISH'}.
        2. Be polite, professional and helpful.
        3. Help with electronics shop management queries (e.g., stock levels, price info, business advice, warranty policies).
        4. Provide advice on electronic items (e.g., trending gadgets, spec comparisons).
        5. Keep responses concise and use line breaks for readability.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'model', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ].map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: m.parts
        })),
      });

      const aiResponse = response.text || (lang === 'bn' ? "দুঃখিত, আমি বুঝতে পারিনি। আবার চেষ্টা করুন।" : "Sorry, I couldn't understand. Please try again.");
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: lang === 'bn' ? "দুঃখিত, বর্তমানে এআই সার্ভারে সমস্যা হচ্ছে। পরে চেষ্টা করুন।" : "Sorry, the AI server is down. Please try later." }]);
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
              width: isMinimized ? '200px' : '380px'
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
                  <h4 className="text-sm font-bold leading-none">{lang === 'bn' ? 'ইলেকট্রনিক্স এআই' : 'Electronics AI'}</h4>
                  {!isMinimized && <p className="text-[10px] text-slate-400 mt-1">{lang === 'bn' ? 'সর্বদা আপনার সেবায়' : 'Always at your service'}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 custom-scrollbar"
                >
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-end gap-2 max-w-[85%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                        msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white border text-indigo-600 shadow-sm"
                      )}>
                        {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm",
                        msg.role === 'user' 
                          ? "bg-indigo-600 text-white rounded-br-none" 
                          : "bg-white text-slate-700 rounded-bl-none border border-slate-100"
                      )}>
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

                {/* Input */}
                <form 
                  onSubmit={handleSend}
                  className="p-4 bg-white border-t border-slate-100 flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t.typeMessage}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button
                    disabled={!input.trim() || isLoading}
                    type="submit"
                    className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
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
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500",
          isOpen ? "bg-indigo-600 text-white rotate-0" : "bg-black text-white hover:bg-slate-900"
        )}
      >
        <MessageSquare size={24} />
      </motion.button>
    </div>
  );
}
