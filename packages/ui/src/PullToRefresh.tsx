'use client';

import { useState, useRef, type ReactNode } from 'react';

export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>; children: ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? 0;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (diff > 50 && !refreshing) {
      setPulling(true);
    }
  };
  
  const handleTouchEnd = async () => {
    if (pulling && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
  };
  
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {pulling && (
        <div className="absolute top-0 left-0 right-0 flex justify-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-sherpa-blue border-t-transparent rounded-full" />
        </div>
      )}
      {children}
    </div>
  );
}
