import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBook, FaChevronLeft, FaSearch } from 'react-icons/fa';

export function Grimoire({ inventory }) { // 👈 Changed prop from 'recipes' to 'inventory'
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter list based on search
  const filteredItems = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed left-6 top-8 z-30 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:scale-110 transition-all ${isOpen ? 'hidden' : 'block'}`}
      >
        <FaBook className="text-xl" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/5 z-40 backdrop-blur-[1px]"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-80 bg-white/90 backdrop-blur-xl border-r border-white shadow-2xl z-50 flex flex-col"
            >
              
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <div>
                  <h2 className="text-lg font-light tracking-widest uppercase text-gray-800">
                    Grimoire
                  </h2>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">
                    TOTAL DISCOVERIES: {inventory.length}
                  </p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                  <FaChevronLeft />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-4">
                <div className="relative group">
                  <FaSearch className="absolute left-3 top-3 text-gray-300 group-focus-within:text-blue-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search collection..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" 
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="text-center mt-20 opacity-40">
                    <p className="text-sm font-light text-gray-500">No matching elements.</p>
                  </div>
                ) : (
                  filteredItems.map((item, index) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      delay={index * 0.05}
                      className="group relative p-3 rounded-lg border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center gap-4"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                        {item.image ? (
                           <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-4 h-4 rounded-full bg-gray-300" />
                        )}
                      </div>
                      
                      {/* Name & ID */}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700 capitalize">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                          ID: {String(item.id).padStart(3, '0')}
                        </span>
                      </div>

                    </motion.div>
                  ))
                )}
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}