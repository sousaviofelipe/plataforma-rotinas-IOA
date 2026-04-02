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

  async function generatePDF() {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // Cabeçalho
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Plataforma de Rotinas", 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Relatório do dia — ${dateStr}`, 14, 25);

    // Resumo
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo do dia", 14, 48);

    autoTable(doc, {
      startY: 53,
      head: [
        ["Total", "Concluídas", "Em andamento", "Pendentes", "Não concluídas"],
      ],

      body: [
        [
          stats.total,
          stats.completed,
          stats.in_progress,
          stats.pending,
          stats.not_completed,
        ],
      ],

      headStyles: { fillColor: [30, 58, 138], fontSize: 10 },
      bodyStyles: { fontSize: 11, halign: "center" },
      columnStyles: {
        0: { halign: "center" },
        1: { textColor: [22, 163, 74], halign: "center" },
        2: { textColor: [202, 138, 4], halign: "center" },
        3: { textColor: [220, 38, 38], halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });

    // Tarefas do dia
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Tarefas do dia", 14, doc.lastAutoTable.finalY + 15);

    const taskRows = todayTasks.map((task) => [
      task.title,
      task.profiles?.full_name || "—",
      task.sectors?.name || "—",
      task.status === "completed"
        ? "Concluída"
        : task.status === "not_completed"
          ? "Não concluída"
          : task.status === "waiting_approval"
            ? "Aguard. aprovação"
            : "Pendente",
      task.justification || "—",
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [["Tarefa", "Responsável", "Setor", "Status", "Justificativa"]],
      body: taskRows,
      headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
      },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const status = data.cell.raw;
          if (status === "Concluída") doc.setTextColor(22, 163, 74);
          else if (status === "Não concluída") doc.setTextColor(220, 38, 38);
          else if (status === "Aguard. aprovação")
            doc.setTextColor(37, 99, 235);
          else doc.setTextColor(202, 138, 4);
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Desempenho por funcionário
    if (performance.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Desempenho por funcionário", 14, doc.lastAutoTable.finalY + 15);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [
          ["Funcionário", "Concluídas", "Pendentes", "Não concluídas", "Total"],
        ],
        body: performance.map((p) => [
          p.name,
          p.completed,
          p.pending,
          p.not_completed,
          p.total,
        ]),
        headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
        bodyStyles: { fontSize: 9, halign: "center" },
        columnStyles: { 0: { halign: "left" } },
        margin: { left: 14, right: 14 },
      });
    }

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

    doc.save(`relatorio-${new Date().toISOString().split("T")[0]}.pdf`);
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
            <button
              onClick={generatePDF}
              className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              📄 Relatório
            </button>
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
