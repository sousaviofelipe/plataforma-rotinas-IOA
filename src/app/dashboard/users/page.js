"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "employee",
    position: "",
    sector: "",
  });

  useEffect(() => {
    loadData();
  }, []);

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

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    setUsers(data || []);
  }

  function openNew() {
    setEditingUser(null);
    setForm({
      full_name: "",
      email: "",
      password: "",
      role: "employee",
      position: "",
      sector: "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setForm({ ...user, password: "" });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (editingUser) {
      const updateData = {
        full_name: form.full_name,
        position: form.position,
        sector: form.sector,
      };

      if (currentProfile?.role === "admin") {
        updateData.role = form.role;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", editingUser.id);

      if (error) {
        setError("Erro ao atualizar usuário.");
      } else {
        setSuccess("Usuário atualizado com sucesso!");
        loadData();
      }
    } else {
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Erro ao criar usuário.");
      } else {
        setSuccess("Usuário criado com sucesso!");
        loadData();
        setShowForm(false);
      }
    }

    setLoading(false);
  }

  async function handleDelete(userId) {
    setLoading(true);

    const res = await fetch("/api/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Erro ao excluir usuário.");
    } else {
      setShowDeleteConfirm(null);
      loadData();
    }

    setLoading(false);
  }

  const roleLabel = (role) => {
    if (role === "admin") return "Administrador";
    if (role === "supervisor") return "Supervisor";
    return "Funcionário";
  };

  const roleBadge = (role) => {
    if (role === "admin") return "bg-purple-100 text-purple-700";
    if (role === "supervisor") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  const isAdmin = currentProfile?.role === "admin";
  const isSupervisor = currentProfile?.role === "supervisor";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
        {(isAdmin || isSupervisor) && (
          <button
            onClick={openNew}
            className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Novo usuário
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">
            {editingUser ? "Editar usuário" : "Novo usuário"}
          </h2>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editingUser}
                className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editingUser ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
                required={!editingUser}
              />
            </div>

            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha inicial
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nível de acesso
              </label>
              {isAdmin ? (
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="employee">Funcionário</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={roleLabel(form.role)}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargo / Função
              </label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Setor
              </label>
              <input
                type="text"
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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

      {/* Modal confirmação de exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-800 mb-2">Confirmar exclusão</h3>
            <p className="text-gray-500 text-sm mb-6">
              Tem certeza que deseja excluir este usuário? Esta ação não pode
              ser desfeita.
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

      {/* Lista de usuários */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-6 py-3 font-medium">Usuário</th>
              <th className="px-6 py-3 font-medium">Cargo</th>
              <th className="px-6 py-3 font-medium">Setor</th>
              <th className="px-6 py-3 font-medium">Nível</th>
              <th className="px-6 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-blue-700 font-bold">
                          {user.full_name?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {user.full_name}
                      </p>
                      <p className="text-gray-400 text-xs">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {user.position || "—"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {user.sector || "—"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${roleBadge(user.role)}`}
                  >
                    {roleLabel(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Editar
                    </button>
                    {currentProfile?.role === "admin" &&
                      user.id !== currentProfile?.id && (
                        <button
                          onClick={() => setShowDeleteConfirm(user.id)}
                          className="text-red-500 hover:underline text-sm"
                        >
                          Excluir
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
