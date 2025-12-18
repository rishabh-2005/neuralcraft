import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ElementCard } from './ElementCard';

export function CraftingSlot({ id, item, onClear }) {
  const { isOver, setNodeRef } = useDroppable({ id: id });

  return (
    <div
      ref={setNodeRef}
      className={`
        relative flex items-center justify-center 
        w-36 h-44 
        rounded-2xl border-2 transition-all duration-300
        ${isOver 
          ? 'border-blue-400 bg-blue-50 scale-105' 
          : 'border-dashed border-gray-300 bg-gray-50/50'
        }
        ${item ? 'border-solid border-white shadow-sm' : ''}
      `}
    >
      {item ? (
        <div className="relative group animate-in fade-in zoom-in duration-200">
          <div className="pointer-events-none">
             {/* 🛑 FIX: Append prefix to ID to prevent Duplicate ID crash */}
             <ElementCard 
               id={`temp-${id}-${item.id}`} 
               name={item.name} 
               image={item.image} 
               draggable={false} 
             />
          </div>
          
          <button 
            onClick={() => onClear(id)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full 
                       flex items-center justify-center text-sm font-bold shadow-sm
                       opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white cursor-pointer pointer-events-auto"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="text-center pointer-events-none select-none">
            <div className="text-2xl text-gray-200 mb-1">+</div>
            <span className="text-gray-400 text-xs font-medium uppercase tracking-widest opacity-50">
              Input
            </span>
        </div>
      )}
    </div>
  );
}