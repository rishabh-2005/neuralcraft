import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { NeuralBackground } from './NeuralBackground';
import toast, { Toaster } from 'react-hot-toast';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Sends a magic link to the user's email
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Link sent! Check your email.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden text-gray-800 font-sans">
      <NeuralBackground />
      <Toaster position="top-center" />
      
      <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white z-10 text-center">
        <h1 className="text-3xl font-extralight tracking-[0.2em] uppercase mb-2">
          Neural<span className="font-bold">Craft</span>
        </h1>
        <p className="text-xs text-gray-400 mb-8 uppercase tracking-widest">
          Authentication Page
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-black hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending Link..." : "Send Link to Email"}
          </button>
        </form>
      </div>
    </div>
  );
}