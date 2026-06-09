import React from 'react';
import { motion } from 'motion/react';

interface MascotCharacterProps {
  isWalking: boolean;
  isWaving: boolean;
}

export const MascotCharacter: React.FC<MascotCharacterProps> = ({ isWalking, isWaving }) => {
  // Walking cycles for legs, arms, and head bobbing
  const legRightVariants = {
    walk: {
      rotate: [20, -20, 20],
      transition: { repeat: Infinity, duration: 0.65, ease: 'easeInOut' }
    },
    idle: { rotate: 2 }
  };

  const legLeftVariants = {
    walk: {
      rotate: [-20, 20, -20],
      transition: { repeat: Infinity, duration: 0.65, ease: 'easeInOut' }
    },
    idle: { rotate: -2 }
  };

  const armLeftVariants = {
    walk: {
      rotate: [-25, 20, -25],
      transition: { repeat: Infinity, duration: 0.65, ease: 'easeInOut' }
    },
    idle: { rotate: -12 }
  };

  const armRightVariants = {
    wave: {
      rotate: [15, -65, -25, -65, -25, -65, 15],
      transition: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }
    },
    walk: {
      rotate: [20, -25, 20],
      transition: { repeat: Infinity, duration: 0.65, ease: 'easeInOut' }
    },
    idle: { rotate: 12 }
  };

  const bobVariants = {
    walk: {
      y: [0, -6, 0],
      transition: { repeat: Infinity, duration: 0.325, ease: 'easeInOut' }
    },
    idle: {
      y: [0, -3, 0],
      transition: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }
    }
  };

  return (
    <div className="relative w-56 h-72 flex flex-col items-center justify-end select-none pointer-events-none">
      {/* Dynamic Ground Shadow */}
      <motion.div 
        animate={isWalking ? {
          scaleX: [0.85, 1.1, 0.85],
          opacity: [0.25, 0.45, 0.25]
        } : {
          scaleX: [1, 1.04, 1],
          opacity: [0.35, 0.4, 0.35]
        }}
        transition={{ repeat: Infinity, duration: 0.65, ease: 'easeInOut' }}
        className="absolute bottom-1 w-36 h-4 bg-slate-900/15 rounded-full blur-[3px]"
      />

      {/* Main Human Body Wrapper with bobble/breathing animation */}
      <motion.div 
        variants={bobVariants}
        animate={isWalking ? "walk" : "idle"}
        className="relative w-full h-full flex flex-col items-center justify-end pb-3"
      >
        
        {/* HAIR & HEAD CONTAINER */}
        <div className="relative w-36 h-36 flex items-center justify-center z-30">
          
          {/* Spiky Black Hair Back Layer */}
          <div className="absolute -top-1 w-36 h-32">
            {/* Spikes drawn with custom polygons to mimic png style */}
            <div className="absolute top-2 left-6 w-9 h-11 bg-slate-800 rotate-[5deg] rounded-tr-[16px]" style={{ clipPath: 'polygon(0% 100%, 15% 0%, 100% 70%)' }} />
            <div className="absolute top-0 left-12 w-10 h-14 bg-slate-800 rotate-[-12deg]" style={{ clipPath: 'polygon(0% 100%, 40% 0%, 100% 100%)' }} />
            <div className="absolute top-0 right-10 w-9 h-12 bg-slate-800 rotate-[8deg]" style={{ clipPath: 'polygon(0% 100%, 60% 0%, 100% 80%)' }} />
            <div className="absolute top-3 right-6 w-8 h-10 bg-slate-800 rotate-[20deg]" style={{ clipPath: 'polygon(0% 100%, 80% 0%, 100% 100%)' }} />
            <div className="absolute top-8 left-3 w-8 h-8 bg-slate-800 rotate-[-40deg]" style={{ clipPath: 'polygon(0% 100%, 10% 0%, 100% 80%)' }} />
            <div className="absolute top-8 right-3 w-8 h-8 bg-slate-800 rotate-[45deg]" style={{ clipPath: 'polygon(0% 100%, 90% 0%, 100% 100%)' }} />
          </div>

          {/* Hair Top Cap Volume */}
          <div className="absolute top-5 inset-x-6 h-18 bg-slate-800 rounded-t-full z-10" />

          {/* Left / Right Sideburns */}
          <div className="absolute top-16 left-6 w-4 h-8 bg-slate-800 rotate-[12deg] z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
          <div className="absolute top-16 right-6 w-4 h-8 bg-slate-800 rotate-[-12deg] z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />

          {/* Face: Peachy skin tone with comic anime elements */}
          <div className="relative w-28 h-26 bg-[#fcd34d]/20 bg-gradient-to-b from-[#fef08a]/30 to-[#fed7aa] rounded-[34px] border-4 border-slate-800 flex flex-col items-center justify-between p-2 shadow-md z-20 overflow-hidden">
            
            {/* Cute rosy blush marks */}
            <div className="absolute bottom-8 left-3 w-4 h-2.5 bg-rose-400/40 rounded-full blur-[1px]" />
            <div className="absolute bottom-8 right-3 w-4 h-2.5 bg-rose-400/40 rounded-full blur-[1px]" />

            {/* Anime Eyes looking up & right confidently */}
            <div className="flex justify-between w-20 mt-6 px-1 z-10">
              
              {/* Left Shiny Eye */}
              <motion.div 
                animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                transition={{ repeat: Infinity, duration: 4.2, times: [0, 0.9, 0.92, 0.94, 1] }}
                className="w-5 h-7 bg-slate-800 rounded-full relative border-2 border-slate-900 flex items-center justify-center"
              >
                {/* Glowing big spark looking top-right */}
                <div className="absolute top-1 right-1 w-2 h-2.5 bg-white rounded-full" />
                <div className="absolute bottom-1 left-1.5 w-1 h-1 bg-white rounded-full opacity-60" />
              </motion.div>

              {/* Right Shiny Eye */}
              <motion.div 
                animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                transition={{ repeat: Infinity, duration: 4.2, times: [0, 0.88, 0.9, 0.92, 1] }}
                className="w-5 h-7 bg-slate-800 rounded-full relative border-2 border-slate-900 flex items-center justify-center"
              >
                {/* Glowing big spark looking top-right */}
                <div className="absolute top-1 right-1 w-2 h-2.5 bg-white rounded-full" />
                <div className="absolute bottom-1 left-1.5 w-1 h-1 bg-white rounded-full opacity-60" />
              </motion.div>

            </div>

            {/* Animated Happy Smile & Cozy Nose */}
            <div className="flex flex-col items-center justify-center w-full mb-1 z-10">
              {/* Nose */}
              <div className="w-2.5 h-1.5 bg-[#f97316]/50 rounded-full mb-1" />

              {/* Cheerful wide-open mouth exactly as the handsome boy cartoon */}
              <div className="w-11 h-4 border-b-[4px] border-slate-800 rounded-b-full flex items-center justify-center overflow-hidden">
                <div className="w-9 h-2 bg-rose-500 rounded-full -mb-1 mt-0.5" />
              </div>
            </div>

            {/* Left and Right Eyebrows (Dynamic tilt based on waving state) */}
            <motion.div 
              animate={isWaving ? { rotate: -12, y: -2 } : { rotate: 0, y: 0 }}
              className="absolute top-4 left-5 w-6 h-1.5 bg-slate-800 rounded-full" 
            />
            <motion.div 
              animate={isWaving ? { rotate: 12, y: -2 } : { rotate: 0, y: 0 }}
              className="absolute top-4 right-5 w-6 h-1.5 bg-slate-800 rounded-full" 
            />
          </div>

          {/* Peach Ears on Sides */}
          <div className="absolute left-[14px] top-1/2 -translate-y-1/2 w-4 h-6 bg-[#fed7aa] border-3 border-slate-800 rounded-l-full z-10" />
          <div className="absolute right-[14px] top-1/2 -translate-y-1/2 w-4 h-6 bg-[#fed7aa] border-3 border-slate-800 rounded-r-full z-10" />
        </div>

        {/* Neck */}
        <div className="w-7 h-5 bg-[#fed7aa] border-x-4 border-b-4 border-slate-850 z-20 -mt-1 shadow-sm" />

        {/* TORSO / SHIRT & TIE (Vibrant red shirt with beautiful necktie) */}
        <div className="relative w-24 h-22 bg-rose-600 rounded-[18px] border-4 border-slate-800 shadow-md z-20 -mt-1 flex flex-col items-center">
          
          {/* Smart Collars (Red collar wings) */}
          <div className="absolute inset-x-2 top-0 h-4 flex justify-between z-30">
            <div className="w-8 h-4 bg-rose-700 border-r-2 border-b-2 border-slate-800 rotate-[22deg] origin-top-left rounded-b-md" />
            <div className="w-8 h-4 bg-rose-700 border-l-2 border-b-2 border-slate-800 rotate-[-22deg] origin-top-right rounded-b-md" />
          </div>

          {/* Tie Knot */}
          <div className="w-4 h-4 bg-[#7a122e] border-2 border-slate-800 rounded-b-md mt-1 z-30 flex justify-center items-center">
            {/* Gloss light on knot */}
            <div className="w-1 h-2 bg-rose-500/30 rounded-full" />
          </div>

          {/* Long Flowing Red Tie with elegant patterns */}
          <motion.div 
            animate={isWalking ? { rotate: [4, -4, 4] } : { rotate: 0 }}
            transition={{ repeat: Infinity, duration: 0.65, ease: 'easeInOut' }}
            style={{ originX: 0.5, originY: 0 }}
            className="w-3.5 h-14 bg-gradient-to-b from-[#881337] to-[#e11d48] border-2 border-slate-850 rounded-b-full z-30 flex flex-col items-center py-1 gap-1 shadow-sm"
          >
            {/* Golden stylish striped patterns */}
            <div className="w-full h-0.5 bg-yellow-400/40 rotate-12" />
            <div className="w-full h-0.5 bg-yellow-400/40 rotate-12" />
            <div className="w-full h-0.5 bg-yellow-400/40 rotate-12" />
          </motion.div>

          {/* Shirt vertical button fold */}
          <div className="absolute top-4 w-1 h-14 bg-rose-800/80 rounded-full" />
          
          {/* Cute corporate ID details inside shirt pocket */}
          <div className="absolute top-5 right-2 w-4 h-4.5 bg-rose-850 rounded-t-sm border-r border-t border-slate-800/20" />
        </div>

        {/* LEFT COMPANION ARM (Swing / Holding tablet ledger) */}
        <motion.div 
          variants={armLeftVariants}
          animate={isWalking ? "walk" : "idle"}
          style={{ originX: 0.85, originY: 0.1 }}
          className="absolute left-[34px] top-[148px] w-5 h-16 bg-rose-600 rounded-full border-4 border-slate-800 z-10"
        >
          {/* Cuff and peach palm */}
          <div className="absolute bottom-0 inset-x-0 h-4 bg-[#fed7aa] border-t-2 border-slate-800 rounded-b-full flex items-center justify-center" />

          {/* Ledgertab details */}
          <div className="absolute -bottom-4 -left-2.5 w-7 h-6 bg-amber-400 rounded-md border-2 border-slate-800 flex items-center justify-center p-0.5 shadow-sm">
            <span className="text-[7px] font-black text-slate-850">📒</span>
          </div>
        </motion.div>

        {/* RIGHT WAVING ARM (Styled wave action) */}
        <motion.div 
          variants={armRightVariants}
          animate={isWaving ? "wave" : (isWalking ? "walk" : "idle")}
          style={{ originX: 0.15, originY: 0.1 }}
          className="absolute right-[34px] top-[148px] w-5 h-16 bg-rose-600 rounded-full border-4 border-slate-800 z-10"
        >
          {/* Hand cuff and waving palm */}
          <div className="absolute bottom-0 inset-x-0 h-4 bg-[#fed7aa] border-t-2 border-slate-800 rounded-b-full flex items-center justify-center shadow-inner" />
        </motion.div>

        {/* WAIST & BELT */}
        <div className="w-18 h-4.5 bg-slate-800 border-x-4 border-b-2 border-slate-900 z-20 -mt-1 flex items-center justify-center ring-1 ring-slate-950/10">
          {/* Golden metallic shiny buckle */}
          <div className="w-5 h-3 bg-amber-400 rounded-sm border border-slate-900 flex items-center justify-center">
            <div className="w-2.5 h-1 bg-slate-900 rounded-full" />
          </div>
        </div>

        {/* LEGS & SHOES AREA */}
        <div className="flex gap-4 w-18 z-10 -mt-0.5 justify-center">
          
          {/* LEFT LEG */}
          <motion.div 
            variants={legLeftVariants}
            animate={isWalking ? "walk" : "idle"}
            style={{ originX: 0.5, originY: 0 }}
            className="w-6 h-14 bg-slate-850 border-r-2 border-slate-900 relative rotate-[-2deg]"
          >
            {/* Elegant Red Trainers / Sneakers styled exactly as the gorgeous uploaded boy cartoon */}
            <div className="absolute bottom-0 -left-1 w-7.5 h-6 flex flex-col items-center justify-end">
              {/* sneaker upper body */}
              <div className="w-full h-4.5 bg-rose-600 border-2 border-slate-850 rounded-t-md relative">
                {/* White laces detail */}
                <div className="absolute inset-x-0 top-0.5 h-1 bg-white/75 border-b border-rose-800" />
              </div>
              {/* White sports styled thick outer sole */}
              <div className="w-8 h-2 bg-slate-100 border-2 border-slate-850 border-t-0 rounded-b-md shadow-sm" />
            </div>
          </motion.div>

          {/* RIGHT LEG */}
          <motion.div 
            variants={legRightVariants}
            animate={isWalking ? "walk" : "idle"}
            style={{ originX: 0.5, originY: 0 }}
            className="w-6 h-14 bg-slate-850 border-l-2 border-slate-900 relative rotate-[2deg]"
          >
            {/* Elegant Red Trainers / Sneakers */}
            <div className="absolute bottom-0 -right-1 w-7.5 h-6 flex flex-col items-center justify-end">
              {/* sneaker upper body */}
              <div className="w-full h-4.5 bg-rose-600 border-2 border-slate-850 rounded-t-md relative">
                {/* White laces detail */}
                <div className="absolute inset-x-0 top-0.5 h-1 bg-white/75 border-b border-rose-800" />
              </div>
              {/* White sports styled thick outer sole */}
              <div className="w-8 h-2 bg-slate-105 bg-white border-2 border-slate-850 border-t-0 rounded-b-md shadow-sm" />
            </div>
          </motion.div>

        </div>

      </motion.div>
    </div>
  );
};
