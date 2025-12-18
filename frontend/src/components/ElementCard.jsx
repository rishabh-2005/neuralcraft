import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export function ElementCard({ id, name, image, isOverlay, draggable = true }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: { name, image },
    disabled: !draggable
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const ref = draggable ? setNodeRef : null;
  const dragProps = draggable ? { ...listeners, ...attributes } : {};

  return (
    <div
      ref={ref}
      style={style}
      {...dragProps}
      className={`
        relative flex flex-col items-center p-2 group
        w-full max-w-[120px] aspect-[4/5]
        /* 🌑 DARK THEME BASE: Dark glass effect */
        bg-gray-900/40 backdrop-blur-md
        border border-white/10 rounded-xl 
        shadow-lg shadow-black/20
        transition-all duration-300
        touch-none select-none
        
        /* ✨ HOVER & DRAG EFFECTS */
        ${draggable ? `
          cursor-grab active:cursor-grabbing 
          hover:bg-gray-800/60 
          hover:border-blue-400/40 
          hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] 
          hover:scale-105 
          hover:-translate-y-1
        ` : ''}

        /* 🚀 OVERLAY STATE (While Dragging) */
        ${isOverlay ? 'shadow-[0_0_30px_rgba(59,130,246,0.5)] scale-110 z-50 bg-gray-800 border-blue-400' : ''}
      `}
    >
      {/* 🖼️ IMAGE CONTAINER (Darker well) */}
      <div className="w-full aspect-square mb-2 bg-black/30 rounded-lg flex items-center justify-center overflow-hidden border border-white/5 relative group-hover:border-white/10 transition-colors">
        {image ? (
          <img 
            src={image} 
            alt={name} 
            className="w-full h-full object-cover pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" 
            draggable={false} 
          />
        ) : (
          // Placeholder for missing images
          <div className="w-1/3 h-1/3 rounded-full border-2 border-gray-700 bg-gray-800/50" />
        )}
      </div>

      {/* 📝 TEXT LABEL (Light gray to glowy blue on hover) */}
      <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide truncate w-full text-center group-hover:text-blue-200 transition-colors duration-300">
        {name}
      </span>
      
      {/* Optional: Tiny tech deco corner */}
      <div className="absolute top-1 right-1 w-1 h-1 bg-white/10 rounded-full group-hover:bg-blue-400/50 transition-colors" />
    </div>
  );
}