"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!profile) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fecha sidebar ao trocar de página no celular
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
  }

  async function loadNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*, tasks(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
  }

  async function markAsRead(notif) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
    );
    setShowNotifications(false);
    router.push(`/dashboard/tasks?task=${notif.task_id}`);
  }

  async function markAllAsRead() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isAdmin = profile?.role === "admin" || profile?.role === "supervisor";

  const navLinks = [
    { href: "/dashboard", label: "Início", icon: "🏠" },
    { href: "/dashboard/tasks", label: "Tarefas", icon: "✅" },
    ...(isAdmin
      ? [
          { href: "/dashboard/manage", label: "Gerenciar", icon: "⚙️" },
          { href: "/dashboard/users", label: "Usuários", icon: "👥" },
          { href: "/dashboard/history", label: "Histórico", icon: "📋" },
        ]
      : [{ href: "/dashboard/history", label: "Histórico", icon: "📋" }]),
    { href: "/dashboard/manual", label: "Manual", icon: "📖" }, // 👈 aqui
    { href: "/dashboard/instalar", label: "Instalar App", icon: "📲" },
    { href: "/dashboard/profile", label: "Meu Perfil", icon: "👤" },
    {
      href: "/dashboard/guia",
      label: "Guia de Uso",
      icon: "📖",
      roles: ["admin", "supervisor", "employee"],
    },
  ];

  const notifIcon = (type) => {
    if (type === "comment") return "💬";
    if (type === "completed") return "✅";
    if (type === "not_completed") return "❌";
    if (type === "approved") return "🎉";
    if (type === "mention") return "📣";
    return "🔔";
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Overlay para fechar sidebar no celular */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed h-full z-30 w-64 bg-blue-950 text-white flex flex-col transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
      >
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="logo"
              className="w-10 h-10 rounded-xl object-cover"
            />

            <div>
              <p className="font-bold text-sm">Plataforma</p>
              <p className="text-blue-300 text-xs">de Rotinas</p>
            </div>
          </div>
        </div>

        {profile && (
          <div className="p-4 border-b border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold">
                    {profile.full_name?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">
                  {profile.full_name}
                </p>
                <p className="text-blue-300 text-xs truncate">
                  {profile.position}
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                pathname === link.href
                  ? "bg-blue-700 text-white font-semibold"
                  : "text-blue-200 hover:bg-blue-800"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-blue-200 hover:bg-blue-800 transition"
          >
            <span>🚪</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Barra superior */}
        <div className="flex items-center justify-between p-4 lg:p-6 lg:pb-0">
          {/* Botão hamburguer — só no celular */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 transition"
          >
            <span className="text-xl">☰</span>
          </button>

          <div className="flex-1" />

          {/* Sininho */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 transition"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-800">Notificações</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-8">
                      Nenhuma notificação.
                    </p>
                  )}
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => markAsRead(notif)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${!notif.read ? "bg-blue-50" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">
                          {notifIcon(notif.type)}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">
                            {notif.message}
                          </p>
                          {notif.tasks?.title && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              "{notif.tasks.title}"
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo da página */}
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
