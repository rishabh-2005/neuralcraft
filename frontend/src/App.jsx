import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import toast, { Toaster } from 'react-hot-toast'; 
import { supabase } from './supabaseClient';
import { AuthPage } from './components/AuthPage';

import { ElementCard } from './components/ElementCard';
import { CraftingSlot } from './components/CraftingSlot';
import { NeuralBackground } from './components/NeuralBackground';
// import { Grimoire } from './components/Grimoire'; // 🟢 Optional: Commented out if you are using the grid below instead

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
  const [session, setSession] = useState(null); 
  const [inventory, setInventory] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
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

  // 2. 📦 FETCH INVENTORY
  useEffect(() => {
    if (!session) return; 

    async function fetchInventory() {
      setIsLoading(true);
      try {
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

  // LOGIN SCREEN
  if (!session) {
    return <AuthPage />;
  }

  // --- GAME LOGIC ---

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

  async function fetchLeaderboard() {
    try {
      const res = await axios.get(`${API_URL}/api/leaderboard`);
      setLeaderboardData(res.data);
      setShowLeaderboard(true);
    } catch (err) {
      toast.error("Could not load Hall of Fame");
    }
  }

  async function handleCombine() {
    if (!slots.slot1 || !slots.slot2 || isProcessing) return;
    setIsProcessing(true);

    const loadingToastId = toast.loading("Synthesizing...", {
      style: { background: '#1f2937', color: '#fff' }
    });

    try {
      const response = await axios.post(`${API_URL}/api/combine`, {
        userId: session.user.id,
        element1Id: slots.slot1.id,
        element2Id: slots.slot2.id
      });

      const data = response.data;
      toast.dismiss(loadingToastId);

      // FAIL
      if (data.message && data.message.includes('cannot be combined')) {
        playSound('fail');
        toast.error("Elements refuse to fuse.", {
          icon: '🚫',
          style: { background: '#374151', color: '#fff' },
        });
        setSlots({ slot1: null, slot2: null });
      } 
      // DUPLICATE
      else if (data.message && (data.message.includes('already in inventory') || data.message.includes('already owned'))) {
        playSound('duplicate');
        setSlots({ slot1: null, slot2: null });
        toast.success(
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="font-bold text-gray-400 text-[10px] uppercase tracking-widest">Rediscovered</span>
            <div className="flex items-center gap-2 mt-1">
              {data.imageUrl && (
                <img 
                  src={data.imageUrl} 
                  alt={data.elementName} 
                  className="w-8 h-8 rounded-md border border-white/20"
                />
              )}
              <span className="capitalize text-blue-200 font-bold text-md">{data.elementName}</span>
            </div>
          </div>,
          {
            duration: 3000,
            icon: '🔄',
            style: { background: 'rgba(17, 24, 39, 0.95)', color: '#fff', border: '1px solid #4B5563' },
          }
        );
      }
      // SUCCESS
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
              style: { background: 'rgba(17, 24, 39, 0.95)', color: '#fff', border: '1px solid #60A5FA', padding: '16px' },
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
      
      {/* 🟢 NAVIGATION: Top Right Controls */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-4">
        {/* 🏆 Trophy Button */}
        <button 
          onClick={fetchLeaderboard}
          className="
            w-10 h-10 flex items-center justify-center
            bg-gray-800/50 backdrop-blur-md 
            rounded-full border border-white/10 
            hover:bg-yellow-500/20 hover:border-yellow-400/50 hover:scale-110
            transition-all duration-300 group cursor-pointer
          "
          title="Hall of Fame"
        >
          <span className="text-xl group-hover:rotate-12 transition-transform">🏆</span>
        </button>

        {/* 🚪 Sign Out Button */}
        <button 
          onClick={handleLogout}
          className="text-xs font-mono text-gray-400 hover:text-red-500 border border-transparent hover:border-red-200 px-3 py-1 rounded-full transition-all"
        >
          SIGNOUT
        </button>
      </div>

      <div className="min-h-screen text-gray-800 flex flex-col items-center justify-between p-6 select-none font-sans relative z-10">
        
        {/* HEADER (Cleaned up) */}
        <header className="mt-8 text-center pointer-events-none">
          <h1 className="text-4xl font-extralight tracking-[0.2em] text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Neural<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Craft</span>
          </h1>
          <p className="text-xs text-blue-300/60 mt-2 tracking-widest uppercase">
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
                w-16 h-16 rounded-full border border-white/10 flex items-center justify-center z-10 transition-all duration-500
                ${slots.slot1 && slots.slot2 
                  ? 'bg-gradient-to-br from-blue-600 to-purple-700 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] scale-110 cursor-pointer hover:scale-125' 
                  : 'bg-gray-900/80 text-gray-600 pointer-events-none'
                }
                ${isProcessing ? 'animate-pulse bg-blue-500' : ''}
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

        {/* 📦 Inventory Grid (DARK SCI-FI MODE) */}
        <div className="w-full max-w-3xl mb-6 z-20">
          <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl p-4 border border-white/10 shadow-2xl shadow-black/50">
            
            <div className="flex items-center justify-between mb-3 px-2 border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-blue-400/80 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
                Discovery Database
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {inventory.length} NODES
              </span>
            </div>
            
            {isLoading ? (
               <div className="flex justify-center items-center h-32 text-blue-400/50 text-sm animate-pulse font-mono">
                 [ ESTABLISHING CONNECTION... ]
               </div>
            ) : (
               <div className="
                 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 
                 gap-2 p-1
                 overflow-y-auto max-h-[320px] 
                 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent
               ">
                 {inventory.length > 0 ? inventory.map((item) => (
                   <ElementCard 
                     key={item.id} 
                     id={item.id} 
                     name={item.name} 
                     image={item.image} 
                   />
                 )) : (
                   <div className="col-span-full text-center text-gray-600 py-8 font-mono text-xs">
                     // DATABASE EMPTY. AWAITING INPUT.
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

        {/* 🏆 LEADERBOARD MODAL */}
        {showLeaderboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLeaderboard(false)}>
            <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 uppercase tracking-widest">
                  Hall of Fame
                </h2>
                <button onClick={() => setShowLeaderboard(false)} className="text-gray-500 hover:text-white">✕</button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                {leaderboardData.map((player, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-gray-800/50 border-white/5'}`}>
                    <div className="flex items-center gap-4">
                      <span className={`font-mono font-bold text-lg w-6 text-center ${index === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        #{index + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className={`font-bold ${index === 0 ? 'text-white' : 'text-gray-300'}`}>
                          {player.username}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Alchemist</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full border border-white/5">
                      <span className="text-blue-400 font-mono font-bold">{player.score}</span>
                      <span className="text-xs text-gray-600">NODES</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

      </div>
    </DndContext>
  );
}