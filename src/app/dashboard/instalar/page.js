"use client";

import { useEffect, useRef, useState } from "react";

export default function InstalarPage() {
  const [instalado, setInstalado] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [aba, setAba] = useState("android");
  const promptRef = useRef(null);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const mobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    setIsMobile(mobile);
    setAba(ios ? "ios" : mobile ? "android" : "windows");

    const handler = (e) => {
      e.preventDefault();
      promptRef.current = e;
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalado(true);
      promptRef.current = null;
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstalar() {
    if (promptRef.current) {
      await promptRef.current.prompt();
      const { outcome } = await promptRef.current.userChoice;
      if (outcome === "accepted") setInstalado(true);
      promptRef.current = null;
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <img
            src="/icon-192x192.png"
            alt="Logo"
            className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow"
          />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Instalar o App
          </h1>
          <p className="text-gray-500 text-sm">
            Instale a plataforma no seu dispositivo para acesso rápido, sem
            precisar abrir o navegador.
          </p>
        </div>

        {instalado ? (
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-green-700 font-semibold">
              ✅ App instalado com sucesso!
            </p>
          </div>
        ) : (
          <>
            {/* Abas */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
              {["android", "ios", "windows"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAba(tab)}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    aba === tab
                      ? "bg-blue-700 text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab === "android"
                    ? "🤖 Android"
                    : tab === "ios"
                      ? "🍎 iPhone"
                      : "💻 Windows"}
                </button>
              ))}
            </div>

            {/* Android */}
            {aba === "android" && (
              <div className="space-y-4">
                {promptRef.current && (
                  <button
                    onClick={handleInstalar}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition text-sm mb-2"
                  >
                    📲 Instalar agora
                  </button>
                )}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-gray-700">
                    Instalar pelo Chrome no Android:
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      1
                    </span>
                    <p className="text-sm text-gray-600">
                      Abra o site no <strong>Google Chrome</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      2
                    </span>
                    <p className="text-sm text-gray-600">
                      Toque nos <strong>3 pontinhos ⋮</strong> no canto superior
                      direito
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      3
                    </span>
                    <p className="text-sm text-gray-600">
                      Toque em <strong>"Adicionar à tela inicial"</strong> ou{" "}
                      <strong>"Instalar app"</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      4
                    </span>
                    <p className="text-sm text-gray-600">
                      Toque em <strong>"Instalar"</strong> para confirmar
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* iOS */}
            {aba === "ios" && (
              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                <p className="text-sm font-semibold text-gray-700">
                  Instalar pelo Safari no iPhone:
                </p>
                <div className="flex items-start gap-3">
                  <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </span>
                  <p className="text-sm text-gray-600">
                    Abra o site no <strong>Safari</strong> — não funciona no
                    Chrome no iPhone
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </span>
                  <p className="text-sm text-gray-600">
                    Toque no botão de compartilhar <strong>⬆️</strong> na barra
                    inferior
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </span>
                  <p className="text-sm text-gray-600">
                    Role para baixo e toque em{" "}
                    <strong>"Adicionar à Tela de Início"</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    4
                  </span>
                  <p className="text-sm text-gray-600">
                    Toque em <strong>"Adicionar"</strong> no canto superior
                    direito
                  </p>
                </div>
              </div>
            )}

            {/* Windows */}
            {aba === "windows" && (
              <div className="space-y-4">
                {promptRef.current && (
                  <button
                    onClick={handleInstalar}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition text-sm mb-2"
                  >
                    💻 Instalar agora
                  </button>
                )}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-gray-700">
                    Instalar pelo Chrome no Windows:
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      1
                    </span>
                    <p className="text-sm text-gray-600">
                      Abra o site no <strong>Google Chrome</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      2
                    </span>
                    <p className="text-sm text-gray-600">
                      Clique nos <strong>3 pontinhos ⋮</strong> no canto
                      superior direito
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      3
                    </span>
                    <p className="text-sm text-gray-600">
                      Clique em <strong>"Salvar e compartilhar"</strong> →{" "}
                      <strong>"Instalar página como app"</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      4
                    </span>
                    <p className="text-sm text-gray-600">
                      Clique em <strong>"Instalar"</strong> para confirmar
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-gray-400 mt-6 text-center">
          Compatível com Android, iPhone e computadores com Chrome ou Edge.
        </p>
      </div>
    </div>
  );
}
