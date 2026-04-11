"use client";

import { useEffect, useState, useRef } from "react";

export default function PwaRegister() {
  const [instalavel, setInstalavel] = useState(false);
  const promptRef = useRef(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    const handler = (e) => {
      e.preventDefault();
      promptRef.current = e;
      setInstalavel(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalavel(false);
      promptRef.current = null;
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstalar() {
    const prompt = promptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalavel(false);
    promptRef.current = null;
  }

  if (!instalavel) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-blue-200 rounded-2xl p-4 flex items-center gap-3 shadow-xl md:left-auto md:right-4 md:w-80">
      <img
        src="/icon-192x192.png"
        alt="IOA IOP"
        className="w-10 h-10 rounded-xl flex-shrink-0"
      />
      <div className="flex-1">
        <p className="text-gray-800 font-bold text-sm">Instalar IOA IOP</p>
        <p className="text-gray-400 text-xs">Adicione à tela inicial</p>
      </div>
      <button
        onClick={handleInstalar}
        className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-3 py-2 rounded-xl text-sm transition"
      >
        Instalar
      </button>
    </div>
  );
}
