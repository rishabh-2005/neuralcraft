import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import toast, { Toaster } from 'react-hot-toast'; 
import { supabase } from './supabaseClient'; // 👈 Import our client
import { AuthPage } from './components/AuthPage'; // 👈 Import login screen

import { ElementCard } from './components/ElementCard';
import { CraftingSlot } from './components/CraftingSlot';
import { NeuralBackground } from './components/NeuralBackground';
import { Grimoire } from './components/Grimoire';

const API_URL = "https://neuralcraft-three.vercel.app";

// 🔊 SOUND ENGINE
function playSound(type) {
  const sounds = {
    discovery: new Audio('/sounds/discovery.mp3'),
    unlock: new Audio('/sounds/unlock.mp3'),
    duplicate: new Audio('/sounds/duplicate.mp3'),
    fail: new Audio('/sounds/fail.mp3')
  };
  const audio = sounds[type];
  if (audio) {
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }
}

export default function App() {
  const [session, setSession] = useState(null); // 👤 Stores User Info
  const [inventory, setInventory] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  
  const [slots, setSlots] = useState({ slot1: null, slot2: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // 1. 🔐 AUTH LISTENER
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. 📦 FETCH INVENTORY (Only if logged in)
  useEffect(() => {
    if (!session) return; // Don't fetch if no user

    async function fetchInventory() {
      setIsLoading(true);
      try {
        // 🟢 USE REAL USER ID FROM SESSION
        const response = await axios.get(`${API_URL}/api/inventory/${session.user.id}`);
        if (Array.isArray(response.data)) {
            setInventory(response.data);
        } else {
            setInventory([]);
        }
      } catch (error) {
        console.error("Failed to load inventory:", error);
        toast.error("Could not load inventory");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInventory();
  }, [session]);

  // If not logged in, show Login Screen
  if (!session) {
    return <AuthPage />;
  }

  // --- GAME LOGIC START ---

  const findItem = (id) => inventory.find((i) => i.id === id);
  const activeItem = findItem(activeId);

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && (over.id === 'slot1' || over.id === 'slot2')) {
      setSlots((prev) => ({ ...prev, [over.id]: findItem(active.id) }));
    }
    setActiveId(null);
  }

  function clearSlot(slotId) {
    setSlots((prev) => ({ ...prev, [slotId]: null }));
  }

  async function handleCombine() {
    if (!slots.slot1 || !slots.slot2 || isProcessing) return;
    setIsProcessing(true);

    const loadingToastId = toast.loading("Synthesizing...", {
      style: { background: '#1f2937', color: '#fff' }
    });

    try {
      // 🟢 USE REAL USER ID HERE TOO
      const response = await axios.post(`${API_URL}/api/combine`, {
        userId: session.user.id,
        element1Id: slots.slot1.id,
        element2Id: slots.slot2.id
      });

      const data = response.data;
      toast.dismiss(loadingToastId);

      if (data.message && data.message.includes('cannot be combined')) {
        playSound('fail');
        toast.error("Elements refuse to fuse.", {
          icon: '🚫',
          style: { background: '#374151', color: '#fff' },
        });
      } 
      else if (data.message && (data.message.includes('already in inventory') || data.message.includes('already owned'))) {
        playSound('duplicate');
        toast("You already have this element.", {
          icon: '🎒',
          style: { background: '#374151', color: '#9CA3AF' },
        });
        setSlots({ slot1: null, slot2: null });
      }
      else {
        const newElement = {
          id: data.elementId,
          name: data.elementName || "Unknown",
          image: data.imageUrl || null
        };

        setInventory(prev => {
          if (prev.find(e => e.id === newElement.id)) return prev;
          return [...prev, newElement];
        });

        setSlots({ slot1: null, slot2: null });

        if (data.message.includes("New element created")) {
          playSound('discovery');
          toast.success(
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-lg">NEW DISCOVERY!</span>
              <span className="capitalize text-blue-300">{newElement.name}</span>
            </div>,
            {
              duration: 5000,
              icon: '🧬',
              style: { 
                background: 'rgba(17, 24, 39, 0.95)', 
                color: '#fff', 
                border: '1px solid #60A5FA',
                padding: '16px',
              },
            }
          );
        } else {
          playSound('unlock');
          toast.success(`Unlocked: ${newElement.name}`, {
            icon: '🔓',
            style: { background: '#1f2937', color: '#fff' },
          });
        }
      }

    } catch (error) {
      toast.dismiss(loadingToastId);
      console.error("Error:", error);
      playSound('fail');
      toast.error("Synthesis Failed (Server Error)");
    } finally {
      setIsProcessing(false);
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setInventory([]);
    setSlots({ slot1: null, slot2: null });
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <Toaster position="top-center" reverseOrder={false} />

      <NeuralBackground />
      <Grimoire inventory={inventory} />

      {/* 🚪 SIGN OUT BUTTON */}
      <div className="fixed top-6 right-6 z-50">
        <button 
          onClick={handleLogout}
          className="text-xs font-mono text-gray-400 hover:text-red-500 border border-transparent hover:border-red-200 px-3 py-1 rounded-full transition-all"
        >
          SIGNOUT
        </button>
      </div>

      <div className="min-h-screen text-gray-800 flex flex-col items-center justify-between p-6 select-none font-sans relative z-10">
        
        <header className="mt-8 text-center pointer-events-none">
          <h1 className="text-4xl font-extralight tracking-[0.2em] text-gray-800 uppercase">
            Neural<span className="font-bold text-gray-900">Craft</span>
          </h1>
          <p className="text-xs text-gray-400 mt-2 tracking-widest uppercase">
            Generative Alchemy Engine v1.0
          </p>
        </header>

        {/* ⚗️ Synthesis Area */}
        <div className="flex-1 flex items-center justify-center w-full max-w-2xl relative">
          <div className="absolute w-32 h-[2px] bg-gradient-to-r from-transparent via-gray-300 to-transparent top-1/2 -z-10" />

          <div className="flex gap-8 md:gap-16 items-center">
            <CraftingSlot id="slot1" item={slots.slot1} onClear={clearSlot} />
            
            <div 
              onClick={handleCombine}
              className={`
                w-14 h-14 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-500
                ${slots.slot1 && slots.slot2 
                  ? 'bg-gray-900 border-gray-900 text-white shadow-xl scale-110 cursor-pointer hover:bg-black hover:scale-125' 
                  : 'bg-white border-gray-200 text-gray-300 pointer-events-none'
                }
                ${isProcessing ? 'animate-pulse bg-blue-600 border-blue-600' : ''}
              `}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="text-2xl pb-1">∞</span>
              )}
            </div>

            <CraftingSlot id="slot2" item={slots.slot2} onClear={clearSlot} />
          </div>
        </div>

        {/* 📦 Inventory Grid (COMPACT) */}
        <div className="w-full max-w-3xl mb-6 z-20">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 border border-white shadow-xl shadow-gray-200/50">
            
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Discovery Database
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {inventory.length} NODES
              </span>
            </div>
            
            {isLoading ? (
               <div className="flex justify-center items-center h-32 text-gray-400 text-sm animate-pulse">
                 Connecting...
               </div>
            ) : (
               <div className="
                 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 
                 gap-2 p-1
                 overflow-y-auto max-h-[320px] 
                 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
               ">
                 {inventory.length > 0 ? inventory.map((item) => (
                   <ElementCard 
                     key={item.id} 
                     id={item.id} 
                     name={item.name} 
                     image={item.image} 
                   />
                 )) : (
                   <div className="col-span-full text-center text-gray-400 py-6">
                     Inventory Empty.
                   </div>
                 )}
               </div>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeItem ? (
            <ElementCard id={activeItem.id} name={activeItem.name} image={activeItem.image} isOverlay={true} />
          ) : null}
        </DragOverlay>

      </div>
    </DndContext>
  );
}