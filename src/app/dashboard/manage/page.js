"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

const DAYS = [
  { value: "monday", label: "Segunda-feira" },
  { value: "tuesday", label: "Terça-feira" },
  { value: "wednesday", label: "Quarta-feira" },
  { value: "thursday", label: "Quinta-feira" },
  { value: "friday", label: "Sexta-feira" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

export default function ManagePage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 8;
  const supabase = createClient();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [filterDay, setFilterDay] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [newSector, setNewSector] = useState("");
  const [showSectorForm, setShowSectorForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    sector_id: "",
    assigned_to: "",
    days: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setCurrentProfile(profile);

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data: tasksData, count } = await supabase
      .from("tasks")
      .select("*, profiles!tasks_assigned_to_fkey(full_name), sectors(name)", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);

    setTasks(tasksData || []);
    setTotalCount(count || 0);

    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, full_name, sector")
      .order("full_name");
    setUsers(usersData || []);

    const { data: sectorsData } = await supabase
      .from("sectors")
      .select("*")
      .order("name");
    setSectors(sectorsData || []);
  }

  function openNew() {
    setEditingTask(null);
    setForm({
      title: "",
      description: "",
      sector_id: "",
      assigned_to: "",
      day_of_week: "monday",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      sector_id: task.sector_id || "",
      assigned_to: task.assigned_to || "",
      days: task.day_of_week ? [task.day_of_week] : [],
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function toggleFormDay(day) {
    setForm((prev) => ({
      ...prev,
      days: (prev.days || []).includes(day)
        ? (prev.days || []).filter((d) => d !== day)
        : [...(prev.days || []), day],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (editingTask) {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: form.title,
          description: form.description,
          sector_id: form.sector_id || null,
          assigned_to: form.assigned_to || null,
          day_of_week: form.day_of_week,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTask.id);

      if (error) {
        setError("Erro ao atualizar tarefa.");
      } else {
        await supabase.from("history").insert({
          task_id: editingTask.id,
          user_id: user.id,
          action: "Tarefa editada",
          details: `Tarefa "${form.title}" foi editada.`,
        });

        setSuccess("Tarefa atualizada com sucesso!");
        loadData();
        setShowForm(false);
      }
    } else {
      if (form.days.length === 0) {
        setError("Selecione pelo menos um dia.");
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      for (const day of form.days) {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            title: form.title,
            description: form.description,
            sector_id: form.sector_id || null,
            assigned_to: form.assigned_to || null,
            day_of_week: day,
            created_by: user.id,
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          setError("Erro ao criar tarefa.");
          setLoading(false);
          return;
        }

        await supabase.from("history").insert({
          task_id: data.id,
          user_id: user.id,
          action: "Tarefa criada",
          details: `Tarefa "${form.title}" foi criada.`,
        });

        if (form.assigned_to) {
          await supabase.from("notifications").insert({
            user_id: form.assigned_to,
            task_id: data.id,
            type: "comment",
            message: `${profileData.full_name} atribuiu a tarefa "${form.title}" para você.`,
          });
        }
      }

      setSuccess("Tarefa(s) criada(s) com sucesso!");
      loadData();
      setShowForm(false);
    }

    setLoading(false);
  }

  async function handleDelete(taskId) {
    setLoading(true);
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) {
      setShowDeleteConfirm(null);
      loadData();
    }
    setLoading(false);
  }

  async function handleAddSector(e) {
    e.preventDefault();
    if (!newSector.trim()) return;
    const { error } = await supabase
      .from("sectors")
      .insert({ name: newSector.trim() });
    if (!error) {
      setNewSector("");
      setShowSectorForm(false);
      loadData();
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filterDay && task.day_of_week !== filterDay) return false;
    if (filterSector && task.sector_id !== filterSector) return false;
    return true;
  });

  const dayLabel = (value) =>
    DAYS.find((d) => d.value === value)?.label || value;

  const statusBadge = (status) => {
    if (status === "completed") return "bg-green-100 text-green-700";
    if (status === "not_completed") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const statusLabel = (status) => {
    if (status === "completed") return "Concluída";
    if (status === "not_completed") return "Não concluída";
    return "Pendente";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Tarefas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSectorForm(!showSectorForm)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Setor
          </button>
          <button
            onClick={openNew}
            className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Nova tarefa
          </button>
        </div>
      </div>

      {/* Formulário novo setor */}
      {showSectorForm && (
        <form
          onSubmit={handleAddSector}
          className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex gap-3 items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do setor
            </label>
            <input
              type="text"
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Administrativo, Limpeza..."
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setShowSectorForm(false)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition"
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Formulário tarefa */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">
            {editingTask ? "Editar tarefa" : "Nova tarefa"}
          </h2>
          <form
            onSubmit={handleSave}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Setor
              </label>
              <select
                value={form.sector_id}
                onChange={(e) =>
                  setForm({ ...form, sector_id: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um setor</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável
              </label>
              <select
                value={form.assigned_to}
                onChange={(e) =>
                  setForm({ ...form, assigned_to: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um funcionário</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dias da semana
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleFormDay(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      (form.days || []).includes(d.value)
                        ? "bg-blue-700 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="col-span-2 text-red-500 text-sm">{error}</p>
            )}
            {success && (
              <p className="col-span-2 text-green-600 text-sm">{success}</p>
            )}

            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os dias</option>
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os setores</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Modal confirmação exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-800 mb-2">Confirmar exclusão</h3>
            <p className="text-gray-500 text-sm mb-6">
              Tem certeza que deseja excluir esta tarefa?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
              >
                {loading ? "Excluindo..." : "Excluir"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de tarefas */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-6 py-3 font-medium">Tarefa</th>
              <th className="px-6 py-3 font-medium">Dia</th>
              <th className="px-6 py-3 font-medium">Setor</th>
              <th className="px-6 py-3 font-medium">Responsável</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-800">{task.title}</p>
                  {task.description && (
                    <p className="text-gray-400 text-xs mt-0.5 truncate max-w-xs">
                      {task.description}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {dayLabel(task.day_of_week)}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {task.sectors?.name || "—"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {task.profiles?.full_name || "—"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(task.status)}`}
                  >
                    {statusLabel(task.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEdit(task)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(task.id)}
                      className="text-red-500 hover:underline text-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  Nenhuma tarefa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Paginação */}
      {totalCount > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Mostrando{" "}
            {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)} a{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}{" "}
            tarefas
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-40"
            >
              ← Anterior
            </button>
            {Array.from(
              { length: Math.ceil(totalCount / ITEMS_PER_PAGE) },
              (_, i) => i + 1,
            ).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${currentPage === page ? "bg-blue-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1),
                )
              }
              disabled={currentPage === Math.ceil(totalCount / ITEMS_PER_PAGE)}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
