"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";

export default function DashboardPage() {
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [performance, setPerformance] = useState([]);
  const [weekData, setWeekData] = useState([]);
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    not_completed: 0,
    in_progress: 0,
  });
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }
  const todayStr = formatDate(new Date());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

    const isAdmin = profileData?.role === "admin";
    const isSupervisor = profileData?.role === "supervisor";

    setIsAdmin(isAdmin || isSupervisor);

    let statsQuery = supabase
      .from("tasks")
      .select("status")
      .lte("date_start", todayStr)
      .gte("date_end", todayStr);

    if (isSupervisor) {
      statsQuery = statsQuery.eq("sector_id", profileData.sector_id);
    } else if (!isAdmin) {
      statsQuery = statsQuery.contains("assigned_users", [user.id]);
    }
    const { data: allTasks } = await statsQuery;

    if (allTasks) {
      setStats({
        total: allTasks.length,
        completed: allTasks.filter((t) => t.status === "completed").length,
        pending: allTasks.filter((t) => t.status === "pending").length,
        not_completed: allTasks.filter((t) => t.status === "not_completed")
          .length,
        in_progress: allTasks.filter((t) => t.status === "in_progress").length,
      });
    }

    let todayQuery = supabase
      .from("tasks")
      .select("*, profiles!tasks_assigned_to_fkey(full_name), sectors(name)")
      .lte("date_start", todayStr)
      .gte("date_end", todayStr)
      .order("created_at");

    if (isSupervisor) {
      todayQuery = todayQuery.eq("sector_id", profileData.sector_id);
    } else if (!isAdmin) {
      todayQuery = todayQuery.contains("assigned_users", [user.id]);
    }

    const { data: todayData } = await todayQuery;
    setTodayTasks(todayData || []);

    let historyQuery = supabase
      .from("history")
      .select("*, profiles(full_name), tasks!inner(title, sector_id)")
      .order("created_at", { ascending: false })
      .limit(5);

    // 👤 usuário comum
    if (!isAdmin && !isSupervisor) {
      historyQuery = historyQuery.eq("user_id", user.id);
    }

    // 👨‍💼 supervisor (filtra por setor)
    if (isSupervisor) {
      historyQuery = historyQuery.eq("tasks.sector_id", profileData.sector_id);
    }

    const { data: historyData } = await historyQuery;
    setRecentHistory(historyData || []);
    if (isAdmin || isSupervisor) {
      let { data: perfTasks } = await supabase
        .from("tasks")
        .select("status, assigned_users, assigned_to, sector_id")
        .lte("date_start", todayStr)
        .gte("date_end", todayStr);

      if (isSupervisor) {
        perfTasks = perfTasks?.filter(
          (t) => t.sector_id === profileData.sector_id,
        );
      }

      const allUserIds = [
        ...new Set(
          (perfTasks || []).flatMap((t) =>
            t.assigned_users?.length > 0
              ? t.assigned_users
              : t.assigned_to
                ? [t.assigned_to]
                : [],
          ),
        ),
      ];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in(
          "id",
          allUserIds.length > 0
            ? allUserIds
            : ["00000000-0000-0000-0000-000000000000"],
        );

      if (perfTasks) {
        const map = {};
        perfTasks.forEach((t) => {
          const users =
            t.assigned_users?.length > 0
              ? t.assigned_users
              : t.assigned_to
                ? [t.assigned_to]
                : [];
          users.forEach((userId) => {
            const profileInfo = (profilesData || []).find(
              (p) => p.id === userId,
            );
            const name = profileInfo?.full_name || "—";
            const avatar = profileInfo?.avatar_url || null;
            if (!map[userId])
              map[userId] = {
                name,
                avatar,
                completed: 0,
                pending: 0,
                in_progress: 0,
                not_completed: 0,
                total: 0,
              };
            map[userId].total++;
            if (t.status === "completed") map[userId].completed++;
            else if (t.status === "pending") map[userId].pending++;
            else if (t.status === "waiting_approval") map[userId].pending++;
            else if (t.status === "in_progress") map[userId].in_progress++;
            else if (t.status === "not_completed") map[userId].not_completed++;
          });
        });
        const sorted = Object.values(map).sort(
          (a, b) => b.completed - a.completed,
        );
        setPerformance(sorted);
      }
    }
    if (isAdmin || isSupervisor) {
      const weekDays = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        weekDays.push(formatDate(d));
      }

      let { data: weekTasks } = await supabase
        .from("tasks")
        .select("status, date_start, date_end, sector_id")
        .lte("date_start", weekDays[weekDays.length - 1])
        .gte("date_end", weekDays[0]);

      if (isSupervisor) {
        weekTasks = weekTasks?.filter(
          (t) => t.sector_id === profileData.sector_id,
        );
      }

      if (weekTasks) {
        const data = weekDays.map((dateStr) => {
          const dayTasks = (weekTasks || []).filter(
            (t) => t.date_start <= dateStr && t.date_end >= dateStr,
          );
          const [y, m, d] = dateStr.split("-");
          return {
            day: `${d}/${m}`,
            Concluídas: dayTasks.filter((t) => t.status === "completed").length,
            Pendentes: dayTasks.filter(
              (t) => t.status === "pending" || t.status === "waiting_approval",
            ).length,
            "Em andamento": dayTasks.filter((t) => t.status === "in_progress")
              .length, // 👈 AQUI
            "Não concluídas": dayTasks.filter(
              (t) => t.status === "not_completed",
            ).length,
          };
        });
        setWeekData(data);
      }
    }
  }

  const statusBadge = (status) => {
    if (status === "completed") return "bg-green-100 text-green-700";
    if (status === "not_completed") return "bg-red-100 text-red-700";
    if (status === "waiting_approval") return "bg-blue-100 text-blue-700";
    if (status === "in_progress") return "bg-purple-100 text-purple-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const statusLabel = (status) => {
    if (status === "completed") return "Concluída";
    if (status === "not_completed") return "Não concluída";
    if (status === "waiting_approval") return "Aguard. aprovação";
    if (status === "in_progress") return "Em andamento";
    return "Pendente";
  };

  function getWeekRange() {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: formatDate(monday), end: formatDate(sunday) };
  }

  function getMonthRange() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: formatDate(start), end: formatDate(end) };
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  async function generatePDF(tipo = "diario") {
    let dateStart, dateEnd, titulo;

    if (tipo === "diario") {
      dateStart = todayStr;
      dateEnd = todayStr;
      titulo = `Relatório do dia — ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`;
    } else if (tipo === "semanal") {
      const range = getWeekRange();
      dateStart = range.start;
      dateEnd = range.end;
      titulo = `Relatório semanal — ${formatDateBR(range.start)} a ${formatDateBR(range.end)}`;
    } else {
      const range = getMonthRange();
      dateStart = range.start;
      dateEnd = range.end;
      titulo = `Relatório mensal — ${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
    }

    // Busca tarefas do período
    const { data: reportTasks } = await supabase
      .from("tasks")
      .select("*, profiles!tasks_assigned_to_fkey(full_name), sectors(name)")
      .lte("date_start", dateEnd)
      .gte("date_end", dateStart)
      .order("date_start");

    const tasks = reportTasks || [];

    const doc = new jsPDF({
      orientation: "landscape",
    });

    // Cabeçalho
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, doc.internal.pageSize.width, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("IOA IOP - Plataforma de Rotinas", 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(titulo, 14, 25);

    // Resumo
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const notCompleted = tasks.filter(
      (t) => t.status === "not_completed",
    ).length;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo do período", 14, 48);

    autoTable(doc, {
      startY: 53,
      head: [
        ["Total", "Concluídas", "Em andamento", "Pendentes", "Não concluídas"],
      ],
      body: [[total, completed, inProgress, pending, notCompleted]],
      headStyles: { fillColor: [30, 58, 138], fontSize: 10 },
      bodyStyles: { fontSize: 11, halign: "center" },
      columnStyles: {
        0: { halign: "center" },
        1: { textColor: [22, 163, 74], halign: "center" },
        2: { textColor: [147, 51, 234], halign: "center" },
        3: { textColor: [202, 138, 4], halign: "center" },
        4: { textColor: [220, 38, 38], halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });

    // Tarefas
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Tarefas do período", 14, doc.lastAutoTable.finalY + 15);

    const taskRows = tasks.map((task) => [
      formatDateBR(task.date_start) +
        (task.date_end !== task.date_start
          ? ` a ${formatDateBR(task.date_end)}`
          : ""),
      task.title,
      task.profiles?.full_name || "—",
      task.sectors?.name || "—",
      task.status === "completed"
        ? "Concluída"
        : task.status === "not_completed"
          ? "Não concluída"
          : task.status === "waiting_approval"
            ? "Aguard. aprovação"
            : task.status === "in_progress"
              ? "Em andamento"
              : "Pendente",
      task.justification || "—",
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [
        ["Data", "Tarefa", "Responsável", "Setor", "Status", "Justificativa"],
      ],
      body: taskRows,
      headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      styles: { overflow: "linebreak", cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 35 },
      },
      margin: { left: 14, right: 14 },
    });

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Gerado em ${new Date().toLocaleString("pt-BR")} — Página ${i} de ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10,
      );
    }

    doc.save(`relatorio-${tipo}-${new Date().toISOString().split("T")[0]}.pdf`);
    setShowReportMenu(false);
  }

  const percent =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div>
      {/* Cabeçalho */}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">
            Olá, {profile?.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Link
              href="/dashboard/manage"
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              ➕ Tarefa
            </Link>
          )}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowReportMenu(!showReportMenu)}
                className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
              >
                📄 Relatório ▾
              </button>
              {showReportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <button
                    onClick={() => generatePDF("diario")}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    📄 Diário
                  </button>
                  <button
                    onClick={() => generatePDF("semanal")}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-50"
                  >
                    📅 Semanal
                  </button>
                  <button
                    onClick={() => generatePDF("mensal")}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-50"
                  >
                    🗓️ Mensal
                  </button>
                </div>
              )}
            </div>
          )}
          <Link
            href="/dashboard/manual"
            className="bg-gray-300 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
          >
            📋 Manual
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          {
            label: "Total",
            value: stats.total,
            color: "bg-blue-50 text-blue-700",
            icon: "📋",
            filter: "all",
          },
          {
            label: "Concluídas",
            value: stats.completed,
            color: "bg-green-50 text-green-700",
            icon: "✅",
            filter: "completed",
          },
          {
            label: "Em andamento",
            value: stats.in_progress,
            color: "bg-purple-50 text-purple-700",
            icon: "🔄",
            filter: "in_progress",
          },
          {
            label: "Pendentes",
            value: stats.pending,
            color: "bg-yellow-50 text-yellow-700",
            icon: "⏳",
            filter: "pending",
          },
          {
            label: "Não concluídas",
            value: stats.not_completed,
            color: "bg-red-50 text-red-700",
            icon: "❌",
            filter: "not_completed",
          },
        ].map((card) => (
          <Link
            key={card.label}
            href={`/dashboard/tasks?status=${card.filter}`}
            className={`rounded-2xl p-4 ${card.color} block hover:opacity-80 transition`}
          >
            <div className="text-xl mb-1">{card.icon}</div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs mt-1 opacity-80">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Barra de progresso */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">
            Progresso de hoje
          </p>
          <p className="text-sm font-bold text-blue-700">{percent}%</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Tarefas de hoje + Atividade recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Tarefas de hoje</h2>
            <Link
              href="/dashboard/tasks"
              className="text-blue-600 text-sm hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          <div className="space-y-3">
            {todayTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {task.title}
                  </p>
                  {isAdmin && task.profiles?.full_name && (
                    <p className="text-xs text-gray-400 truncate">
                      {task.profiles.full_name}
                    </p>
                  )}
                </div>
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(task.status)}`}
                >
                  {statusLabel(task.status)}
                </span>
              </div>
            ))}
            {todayTasks.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                Nenhuma tarefa para hoje.
              </p>
            )}
            {todayTasks.length > 5 && (
              <Link
                href="/dashboard/tasks"
                className="text-blue-600 text-sm hover:underline block text-center"
              >
                +{todayTasks.length - 5} tarefas
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Atividade recente</h2>
            <Link
              href="/dashboard/history"
              className="text-blue-600 text-sm hover:underline"
            >
              Ver tudo →
            </Link>
          </div>
          <div className="space-y-3">
            {recentHistory.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 text-xs font-bold">
                    {item.profiles?.full_name?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">
                    <span className="font-medium">
                      {item.profiles?.full_name}
                    </span>
                    {" — "}
                    {item.action}
                  </p>
                  {item.tasks?.title && (
                    <p className="text-xs text-gray-400 truncate">
                      "{item.tasks.title}"
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
            {recentHistory.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                Nenhuma atividade recente.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Desempenho por funcionário — só admin/supervisor */}
      {isAdmin && performance.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-700 mb-4">
            📊 Desempenho de hoje
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mb-1">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-100">
                  <th className="pb-2 font-medium">👤</th>
                  <th className="pb-2 font-medium text-center">✅</th>
                  <th className="pb-2 font-medium text-center">🔄</th>
                  <th className="pb-2 font-medium text-center">⏳</th>
                  <th className="pb-2 font-medium text-center">❌</th>
                  <th className="pb-2 font-medium text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* DESEMPENHO DE HOJE RANKING 3 PESSOAS */}
                {performance.slice(0, 3).map((p) => (
                  <tr key={p.name} className="hover:bg-gray-50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.avatar ? (
                            <img
                              src={p.avatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-blue-700 text-xs font-bold">
                              {p.name?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-gray-800">
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-center text-green-600 font-semibold">
                      {p.completed}
                    </td>
                    <td className="py-2 text-center text-purple-600 font-semibold">
                      {p.in_progress}
                    </td>
                    <td className="py-2 text-center text-yellow-600 font-semibold">
                      {p.pending}
                    </td>
                    <td className="py-2 text-center text-red-500 font-semibold">
                      {p.not_completed}
                    </td>
                    <td className="py-2 text-center text-gray-500">
                      {p.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gráfico de produtividade semanal */}
      {isAdmin && weekData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">
            📈 Produtividade da semana
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={weekData}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
            >
              <XAxis dataKey="day" tick={{ fontSize: 13 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Concluídas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="Em andamento"
                fill="#9333ea"
                radius={[4, 4, 0, 0]}
              />

              <Bar dataKey="Pendentes" fill="#eab308" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="Não concluídas"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
