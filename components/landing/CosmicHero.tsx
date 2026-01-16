'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image'; 
import { cn } from '@/lib/utils';

// UPDATED: Added 'link' property to each brand
const BRANDS = [
  { 
    name: 'SportPesa', 
    logo: '/logos/sp.jpeg', 
    color: 'border-blue-500',
    link: 'https://www.ke.sportpesa.com/jackpot' 
  },
  { 
    name: 'SportyBet', 
    logo: '/logos/sb.png',  
    color: 'border-red-500',
    link: 'https://www.sportybet.com/ke/jackpot' 
  },
  { 
    name: 'Mozzart',   
    logo: '/logos/mz.jpg',  
    color: 'border-yellow-500',
    link: 'https://www.mozzartbet.co.ke/en#/jackpot' 
  },
  { 
    name: 'Shabiki',   
    logo: '/logos/sk.svg',  
    color: 'border-rose-500',
    link: 'https://shabiki.com/Jackpot' 
  },
];

export default function CosmicHero() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setRotation(window.scrollY * 0.2);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center overflow-hidden">
      
      {/* 1. THE SUPERBEING (Center) */}
      <div className="relative z-10 w-[500px] h-[500px] flex items-center justify-center animate-in fade-in duration-1000">
        <div className="absolute inset-0 bg-cyan-500/30 blur-[100px] rounded-full animate-pulse" />
        <div className="relative w-full h-full">
            <Image 
              src="/hero-entity.png" 
              alt="The Entity" 
              fill
              className="object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"
              priority
            />
        </div>
      </div>

      {/* 2. THE ORBIT RINGS */}
      <div className="absolute border border-cyan-500/20 rounded-full w-[400px] h-[400px] animate-spin-slow" />
      <div className="absolute border border-purple-500/20 rounded-full w-[600px] h-[600px] opacity-50" />

      {/* 3. THE PLANETS (Rotating Links) */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75 ease-out"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {BRANDS.map((brand, i) => {
          const angle = (i * 360) / BRANDS.length;
          const radius = 240; 
          
          return (
            <a
              key={brand.name}
              href={brand.link}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute flex flex-col items-center justify-center pointer-events-auto cursor-pointer group" // Added pointer-events-auto
              style={{
                transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle + rotation}deg)`
              }}
            >
              {/* LOGO CONTAINER */}
              <div className={cn(
                "w-16 h-16 rounded-full bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center overflow-hidden border-2 transition-all group-hover:scale-125 group-hover:shadow-[0_0_50px_rgba(255,255,255,0.4)]", 
                brand.color
              )}>
                <div className="relative w-12 h-12">
                  <Image 
                    src={brand.logo} 
                    alt={brand.name} 
                    fill 
                    className="object-contain" 
                  />
                </div>
              </div>
              
              {/* LABEL */}
              <div className="mt-2 px-2 py-1 bg-black/80 rounded text-[10px] text-gray-300 uppercase tracking-widest backdrop-blur-sm border border-gray-800 group-hover:bg-cyan-900 group-hover:text-cyan-400 group-hover:border-cyan-500 transition-colors">
                {brand.name}
              </div>
            </a>
          );
        })}
      </div>
      
    </div>
  );
}