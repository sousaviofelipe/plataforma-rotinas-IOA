'use client'

import { useEffect, useRef, useState } from 'react'

export default function InstalarPage() {
  const [instalavel, setInstalavel] = useState(false)
  const [instalado, setInstalado] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const promptRef = useRef(null)

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent))

    const handler = (e) => {
      e.preventDefault()
      promptRef.current = e
      setInstalavel(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalado(true)
      setInstalavel(false)
      promptRef.current = null
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstalar() {
    const prompt = promptRef.current
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalado(true)
    promptRef.current = null
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <img src="/icon-192x192.png" alt="Logo" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Instalar o App</h1>
        <p className="text-gray-500 text-sm mb-8">
          Instale a plataforma no seu dispositivo para acesso rápido, sem precisar abrir o navegador.
        </p>

        {instalado ? (
          <div className="bg-green-50 rounded-xl p-4 mb-6">
            <p className="text-green-700 font-semibold">✅ App instalado com sucesso!</p>
          </div>
        ) : isIOS ? (
          <div className="bg-blue-50 rounded-xl p-5 text-left space-y-3 mb-6">
            <p className="text-sm font-semibold text-blue-700 mb-2">Como instalar no iPhone / iPad:</p>
            <div className="flex items-start gap-3">
              <span className="text-xl">1️⃣</span>
              <p className="text-sm text-gray-600">Toque no botão de compartilhar <strong>⬆️</strong> no Safari</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">2️⃣</span>
              <p className="text-sm text-gray-600">Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">3️⃣</span>
              <p className="text-sm text-gray-600">Toque em <strong>"Adicionar"</strong> no canto superior direito</p>
            </div>
          </div>
        ) : instalavel ? (
          <button
            onClick={handleInstalar}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition text-sm mb-6"
          >
            📲 Instalar agora
          </button>
        ) : (
          <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-2">Como instalar manualmente:</p>
            <div className="flex items-start gap-3">
              <span className="text-xl">1️⃣</span>
              <p className="text-sm text-gray-600">No Chrome, toque no menu <strong>⋮</strong> no canto superior direito</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">2️⃣</span>
              <p className="text-sm text-gray-600">Toque em <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar app"</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">3️⃣</span>
              <p className="text-sm text-gray-600">Confirme tocando em <strong>"Instalar"</strong></p>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 rounded-xl p-4 text-left">
          <p className="text-xs font-semibold text-yellow-700 mb-1">⚠️ Botão não aparece?</p>
          <p className="text-xs text-yellow-600">O Chrome só mostra o botão de instalação uma vez por sessão. Feche e reabra o navegador e volte a esta página.</p>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Funciona em Android, iPhone e computadores com Chrome ou Edge.
        </p>
      </div>
    </div>
  )
}