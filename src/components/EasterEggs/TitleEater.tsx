"use client";

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { EASTER_EGGS, isEasterEggEnabled } from '@/lib/easterEggs/registry';

interface TitleEaterProps {
  title: string;
  onComplete?: () => void;
}

// Different creatures that can eat the title
const CREATURES = [
  { emoji: '🐛', name: 'caterpillar', speed: 150 },
  { emoji: '🐌', name: 'snail', speed: 250 },
  { emoji: '🐁', name: 'mouse', speed: 100 },
  { emoji: '👾', name: 'alien', speed: 120 },
  { emoji: '🦖', name: 'dinosaur', speed: 80 },
  { emoji: '🦈', name: 'shark', speed: 60 },   // super fast
  { emoji: '🐢', name: 'turtle', speed: 300 }, // very slow
];

type DisplayMode = 'logo' | 'text';

export function TitleEater({ title, onComplete }: TitleEaterProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('logo');
  const [displayTitle, setDisplayTitle] = useState(title);
  const [isEating, setIsEating] = useState(false);
  const [creature, setCreature] = useState(CREATURES[0]);
  const [showCreature, setShowCreature] = useState(false);
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [isEatingLogo, setIsEatingLogo] = useState(false);

  const startEating = useCallback(() => {
    if (isEating || isEatingLogo) return;
    if (!isEasterEggEnabled('titleEater')) return;

    // Pick a random creature
    const randomCreature = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    setCreature(randomCreature);
    setShowCreature(true);

    if (displayMode === 'logo') {
      // Eating the logo - fade it out
      setIsEatingLogo(true);
    } else {
      // Eating the text - letter by letter
      setIsEating(true);
    }
  }, [isEating, isEatingLogo, displayMode]);

  // Handle click to trigger
  const handleClick = useCallback(() => {
    startEating();
  }, [startEating]);

  // Trigger after delay (only on initial load with logo)
  useEffect(() => {
    const config = EASTER_EGGS.titleEater;
    if (!config.enabled || isEating || isEatingLogo) return;
    if (displayMode !== 'logo') return; // Only auto-trigger when showing logo

    const timer = setTimeout(() => {
      startEating();
    }, config.triggerDelay || 60000);

    return () => clearTimeout(timer);
  }, [displayMode, isEating, isEatingLogo, startEating]);

  // Logo eating animation (fade out)
  useEffect(() => {
    if (!isEatingLogo) return;

    if (logoOpacity > 0) {
      const timer = setTimeout(() => {
        setLogoOpacity(prev => Math.max(0, prev - 0.1));
      }, creature.speed);
      return () => clearTimeout(timer);
    } else {
      // Logo fully eaten - wait then switch to text
      setTimeout(() => {
        setShowCreature(false);
        setIsEatingLogo(false);
        setDisplayMode('text');
        setDisplayTitle(title);
        setLogoOpacity(1); // Reset for next time
        onComplete?.();
      }, 500);
    }
  }, [isEatingLogo, logoOpacity, creature.speed, title, onComplete]);

  // Text eating animation (letter by letter)
  useEffect(() => {
    if (!isEating || displayTitle.length === 0) {
      if (isEating && displayTitle.length === 0) {
        // Done eating text - wait then switch to logo
        setTimeout(() => {
          setShowCreature(false);
          setIsEating(false);
          setDisplayMode('logo');
          onComplete?.();
        }, 500);
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayTitle(prev => prev.slice(0, -1));
    }, creature.speed);

    return () => clearTimeout(timer);
  }, [isEating, displayTitle, creature.speed, onComplete]);

  // Fixed container dimensions - logo will set the width, text must fit same space
  const containerStyle = {
    width: '140px',
    height: '64px',
  };

  return (
    <div
      className="relative flex items-center justify-start cursor-pointer select-none overflow-hidden"
      style={containerStyle}
      onClick={handleClick}
      title="Click me...">
      {displayMode === 'logo' ? (
        <div
          className="transition-opacity duration-100 h-full flex items-center"
          style={{ opacity: logoOpacity }}
        >
          <Image
            src="/smaller_logo.png"
            alt="Infrastructure Dashboard"
            width={846}
            height={851}
            className="h-full w-auto block"
          />
        </div>
      ) : (
        <div
          className={`${isEating ? 'transition-all' : ''} font-semibold flex items-center justify-start h-full w-full`}
          style={{ fontSize: '1rem', lineHeight: '1.2' }}
        >
          {displayTitle || <span className="opacity-0">.</span>}
        </div>
      )}

      {showCreature && (
        <span
          className={`absolute transition-all duration-300 ${
            (isEatingLogo && logoOpacity <= 0) || (isEating && displayTitle.length === 0)
              ? 'animate-bounce'
              : ''
          }`}
          style={{
            right: '-1.5em',
            fontSize: '1.5em',
          }}
          title={`A hungry ${creature.name}!`}
        >
          {creature.emoji}
        </span>
      )}
    </div>
  );
}
