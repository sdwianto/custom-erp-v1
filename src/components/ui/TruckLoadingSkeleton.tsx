"use client";

import * as React from 'react';

type TruckLoadingSkeletonProps = {
  className?: string;
  message?: string;
};

/**
 * TruckLoadingSkeleton
 * A lightweight loading skeleton that animates a truck loading cargo boxes.
 * Works in light/dark mode; no client hooks required.
 */
export function TruckLoadingSkeleton({ className, message = 'Loading...' }: TruckLoadingSkeletonProps) {
  return (
    <div className={['w-full h-64 flex items-center justify-center', className ?? ''].join(' ')}>
      <div className="relative w-full max-w-3xl h-48">
        {/* Road */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gray-200 dark:bg-gray-800 overflow-hidden rounded-md">
          <div className="absolute inset-0 opacity-40">
            <div className="h-full w-[200%] bg-[linear-gradient(to_right,transparent_0px,transparent_36px,rgba(255,255,255,0.5)_36px,rgba(255,255,255,0.5)_40px,transparent_40px,transparent_80px)] animate-road" />
          </div>
        </div>

        {/* Truck Group */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-2">
          {/* Trailer / Cargo Bed */}
          <div className="relative w-64 h-24 bg-gray-200 dark:bg-gray-800 rounded-md border border-gray-300/50 dark:border-gray-700/60">
            {/* Bed rails */}
            <div className="absolute -top-2 left-2 right-2 h-2 bg-gray-300 dark:bg-gray-700 rounded-sm" />
            {/* Bed fill (simulated progress shimmer) */}
            <div className="absolute inset-2 rounded-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-shimmer" />
            </div>
          </div>

          {/* Cabin */}
          <div className="relative w-28 h-20 bg-gray-200 dark:bg-gray-800 rounded-md border border-gray-300/50 dark:border-gray-700/60">
            <div className="absolute top-2 left-2 right-6 h-6 bg-gray-300/80 dark:bg-gray-700/80 rounded-sm" />
          </div>
        </div>

        {/* Wheels */}
        <div className="absolute bottom-[2.25rem] left-1/2 -translate-x-1/2 flex w-[calc(16rem+7rem)] justify-between px-4">
          <div className="w-8 h-8 bg-gray-700 dark:bg-gray-300 rounded-full border-4 border-gray-900 dark:border-gray-100 animate-wheel" />
          <div className="w-8 h-8 bg-gray-700 dark:bg-gray-300 rounded-full border-4 border-gray-900 dark:border-gray-100 animate-wheel" />
          <div className="w-8 h-8 bg-gray-700 dark:bg-gray-300 rounded-full border-4 border-gray-900 dark:border-gray-100 animate-wheel" />
        </div>

        {/* Loading conveyor (left side) */}
        <div className="absolute bottom-16 left-[calc(50%-15rem)] w-40 h-4 bg-gray-300 dark:bg-gray-700 rounded-md">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0px,transparent_18px,rgba(0,0,0,0.12)_18px,rgba(0,0,0,0.12)_22px,transparent_22px,transparent_40px)] opacity-50 animate-belt" />
        </div>

        {/* Cargo boxes moving onto the truck */}
        <div className="absolute bottom-20 left-[calc(50%-15rem)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`box-${i}`}
              className="absolute w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-sm border border-gray-400/70 dark:border-gray-500/70 animate-box"
              style={{ animationDelay: `${i * 0.6}s` }}
            />
          ))}
        </div>

        {/* Label */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-sm text-gray-600 dark:text-gray-400 select-none">
          {message}
        </div>

        {/* Local keyframes */}
        <style jsx>{`
          @keyframes wheel-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes road-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes belt {
            from { background-position-x: 0; }
            to { background-position-x: -40px; }
          }
          @keyframes box-move {
            0% { transform: translate(0, 0); opacity: 0; }
            10% { opacity: 1; }
            50% { transform: translate(120px, -8px); }
            70% { transform: translate(220px, -10px); }
            100% { transform: translate(300px, -12px); opacity: 0.9; }
          }
          .animate-wheel { animation: wheel-rotate 1.2s linear infinite; }
          .animate-road { animation: road-scroll 1.8s linear infinite; }
          .animate-shimmer::before {
            content: '';
            position: absolute;
            inset: 0;
            transform: translateX(-100%);
            background: linear-gradient(
              to right,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.6) 50%,
              rgba(255,255,255,0) 100%
            );
            animation: shimmer 1.6s ease-in-out infinite;
          }
          .dark .animate-shimmer::before {
            background: linear-gradient(
              to right,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.15) 50%,
              rgba(255,255,255,0) 100%
            );
          }
          .animate-belt { animation: belt 0.9s linear infinite; }
          .animate-box { animation: box-move 2.4s ease-in-out infinite; }
        `}</style>
      </div>
    </div>
  );
}

export default TruckLoadingSkeleton;


