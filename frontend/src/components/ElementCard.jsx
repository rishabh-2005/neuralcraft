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
        relative flex flex-col items-center p-2
        /* 🟢 CHANGED: Width is now dynamic (fills the grid cell) but has a max limit */
        w-full max-w-[120px] aspect-[4/5]
        bg-white rounded-xl 
        shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100
        transition-all duration-300
        touch-none select-none
        ${draggable ? 'cursor-grab active:cursor-grabbing hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-105 hover:border-blue-200' : ''}
        ${isOverlay ? 'shadow-2xl scale-110 z-50 rotate-2' : ''}
      `}
    >
      {/* 🟢 CHANGED: Image container is flexible height */}
      <div className="w-full aspect-square mb-2 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 relative">
        {image ? (
          <img 
            src={image} 
            alt={name} 
            className="w-full h-full object-cover pointer-events-none" 
            draggable={false} 
          />
        ) : (
          <div className="w-1/3 h-1/3 rounded-full border-2 border-gray-200 bg-gray-50" />
        )}
      </div>

      <span className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wide truncate w-full text-center">
        {name}
      </span>
    </div>
  );
}