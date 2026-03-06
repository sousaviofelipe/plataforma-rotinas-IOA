"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export default function HistoryPage() {
  const supabase = createClient();
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(profileData);

    let query = supabase
      .from("history")
      .select("*, profiles(full_name, avatar_url), tasks(title)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (profileData?.role === "employee") {
      query = query.eq("user_id", user.id);
    }

    const { data: historyData } = await query;
    setHistory(historyData || []);

    if (profileData?.role !== "employee") {
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      setUsers(usersData || []);
    }

    setLoading(false);
  }

  const filteredHistory = history.filter((item) => {
    if (filterUser && item.user_id !== filterUser) return false;
    if (
      filterAction &&
      !item.action.toLowerCase().includes(filterAction.toLowerCase())
    )
      return false;
    return true;
  });

  const actionIcon = (action) => {
    if (action.includes("criada")) return "🆕";
    if (action.includes("editada")) return "✏️";
    if (action.includes("Check-in")) return "✅";
    if (action.includes("não concluída") || action.includes("Não concluída"))
      return "❌";
    if (action.includes("Comentário")) return "💬";
    return "📋";
  };

  const actionColor = (action) => {
    if (action.includes("Check-in")) return "bg-green-100 text-green-700";
    if (action.includes("não concluída") || action.includes("Não concluída"))
      return "bg-red-100 text-red-700";
    if (action.includes("Comentário")) return "bg-blue-100 text-blue-700";
    if (action.includes("editada")) return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Histórico</h1>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        {profile?.role !== "employee" && (
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os usuários</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        )}
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as ações</option>
          <option value="criada">Tarefas criadas</option>
          <option value="editada">Tarefas editadas</option>
          <option value="Check-in">Check-ins / Pendentes</option>
          <option value="aprovada">Concluídas</option>
          <option value="não concluída">Não concluídas</option>
          <option value="Comentário">Comentários</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.profiles?.avatar_url ? (
                    <img
                      src={item.profiles.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-blue-700 font-bold text-sm">
                      {item.profiles?.full_name?.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">
                      {item.profiles?.full_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionColor(item.action)}`}
                    >
                      {actionIcon(item.action)} {item.action}
                    </span>
                    {item.tasks?.title && (
                      <span className="text-gray-500 text-sm">
                        em{" "}
                        <span className="font-medium">
                          "{item.tasks.title}"
                        </span>
                      </span>
                    )}
                  </div>
                  {item.details && (
                    <p className="text-gray-500 text-sm mt-1">{item.details}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}

            {filteredHistory.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-400">
                Nenhum registro encontrado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
