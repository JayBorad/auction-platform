'use client';

import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface PlayerSoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  teamName: string;
  playerImage?: string;
  teamLogo?: string;
  amount: number;
}

export default function PlayerSoldModal({
  isOpen,
  onClose,
  playerName,
  teamName,
  playerImage,
  teamLogo,
  amount
}: PlayerSoldModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Play hammer sound
      const playHammerSound = () => {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 200;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
          console.log('Could not play hammer sound:', error);
        }
      };

      // Play popup sound (celebration sound)
      const playPopupSound = () => {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Create a more celebratory sound with multiple tones
          const playTone = (frequency: number, startTime: number, duration: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
          };

          // Play a chord (C major: C, E, G)
          playTone(523.25, 0, 0.5); // C5
          playTone(659.25, 0.1, 0.5); // E5
          playTone(783.99, 0.2, 0.5); // G5
        } catch (error) {
          console.log('Could not play popup sound:', error);
        }
      };

      // Play hammer sound immediately
      playHammerSound();
      
      // Play popup sound after a short delay
      setTimeout(() => {
        playPopupSound();
      }, 200);

      // Auto-close after 2 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="bg-gradient-to-br from-yellow-900/95 via-yellow-800/95 to-orange-900/95 border-yellow-600/50 max-w-md p-0 overflow-hidden">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative p-8 text-center"
            >
              {/* Confetti/Sparkles Animation */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    initial={{
                      x: '50%',
                      y: '50%',
                      opacity: 1,
                      scale: 0
                    }}
                    animate={{
                      x: `${50 + (Math.random() - 0.5) * 100}%`,
                      y: `${50 + (Math.random() - 0.5) * 100}%`,
                      opacity: 0,
                      scale: 1
                    }}
                    transition={{
                      duration: 1.5,
                      delay: Math.random() * 0.5,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>

              {/* Trophy Icon */}
              <motion.div
                initial={{ y: -20, rotate: -10 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="mb-4 flex justify-center"
              >
                <div className="relative">
                  <Trophy className="w-20 h-20 text-yellow-400 drop-shadow-lg" />
                  <Sparkles className="w-8 h-8 text-yellow-300 absolute -top-2 -right-2 animate-pulse" />
                </div>
              </motion.div>

              {/* Congratulations Text */}
              <DialogTitle asChild>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold text-white mb-2 drop-shadow-lg"
                >
                  🎉 Congratulations! 🎉
                </motion.h2>
              </DialogTitle>

              {/* Player and Team Info */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-4 my-6"
              >
                {/* Player Avatar */}
                <div className="flex justify-center">
                  <Avatar className="w-24 h-24 border-4 border-yellow-400 shadow-lg">
                    <AvatarImage src={playerImage} alt={playerName} />
                    <AvatarFallback className="bg-yellow-600 text-white text-2xl">
                      {playerName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Player Name */}
                <div>
                  <p className="text-xl font-semibold text-yellow-200 mb-1">{playerName}</p>
                  <div className="flex items-center justify-center gap-2 text-yellow-300">
                    <span className="text-lg">goes to</span>
                  </div>
                </div>

                {/* Team Info */}
                <div className="flex items-center justify-center gap-3">
                  {teamLogo && (
                    <Avatar className="w-16 h-16 border-2 border-yellow-400">
                      <AvatarImage src={teamLogo} alt={teamName} />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {teamName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <p className="text-2xl font-bold text-white">{teamName}</p>
                </div>

                {/* Amount */}
                <div className="pt-2 border-t border-yellow-600/50">
                  <p className="text-sm text-yellow-200 mb-1">Sold for</p>
                  <p className="text-3xl font-bold text-yellow-400">{formatCurrency(amount)}</p>
                </div>
              </motion.div>

              {/* Close Button */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors shadow-lg"
              >
                Awesome!
              </motion.button>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

