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
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    sector_id: "",
    assigned_users: [],
    date_start: "",
    date_end: "",
  });

  const supabase = createClient();

  const [users, setUsers] = useState([]);
  const [sectors, setSectors] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: usersData } = await supabase.from("profiles").select("*");
    setUsers(usersData || []);

    const { data: sectorsData } = await supabase.from("sectors").select("*");
    setSectors(sectorsData || []);
  }

  function toggleAssignedUser(userId) {
    setForm((prev) => ({
      ...prev,
      assigned_users: prev.assigned_users.includes(userId)
        ? prev.assigned_users.filter((id) => id !== userId)
        : [...prev.assigned_users, userId],
    }));
  }

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  function getCalendarDays(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }

  function handleCalendarClick(dateStr) {
    if (!form.date_start || form.date_end) {
      setForm((prev) => ({
        ...prev,
        date_start: dateStr,
        date_end: "",
      }));
    } else {
      if (dateStr < form.date_start) {
        setForm((prev) => ({
          ...prev,
          date_start: dateStr,
          date_end: "",
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          date_end: dateStr,
        }));
      }
    }
  }

  return (
    <div className="p-3 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          Gerenciar Tarefas
        </h1>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button className="bg-gray-100 px-4 py-2 rounded-lg text-sm">
            + Setor
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            + Nova tarefa
          </button>
        </div>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-6">
          <form className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* TÍTULO */}
            <div className="col-span-2">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Título"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* DESCRIÇÃO */}
            <div className="col-span-2">
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Descrição"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* SETOR */}
            <div>
              <select
                value={form.sector_id}
                onChange={(e) =>
                  setForm({ ...form, sector_id: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione um setor</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* RESPONSÁVEIS */}
            <div className="col-span-2">
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAssignedUser(u.id)}
                    className={`px-2 py-1 rounded-lg text-xs sm:text-sm ${
                      form.assigned_users.includes(u.id)
                        ? "bg-blue-700 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    {u.full_name}
                  </button>
                ))}
              </div>
            </div>

            {/* CALENDÁRIO */}
            <div className="col-span-2">
              <div className="border rounded-xl p-3 sm:p-4 bg-gray-50 overflow-x-auto">
                <div className="min-w-[320px]">
                  <div className="flex justify-between mb-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarDate(
                          new Date(
                            calendarDate.getFullYear(),
                            calendarDate.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                    >
                      ←
                    </button>

                    <span className="text-sm font-semibold">
                      {calendarDate.toLocaleString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCalendarDate(
                          new Date(
                            calendarDate.getFullYear(),
                            calendarDate.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                    >
                      →
                    </button>
                  </div>

                  <div className="grid grid-cols-7 text-xs text-center mb-1">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                      (d) => (
                        <div key={d}>{d}</div>
                      ),
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {getCalendarDays(calendarDate).map((day, idx) => {
                      if (!day) return <div key={idx} />;

                      const dateStr = formatDate(day);
                      const isSelected =
                        form.date_start === dateStr ||
                        form.date_end === dateStr;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleCalendarClick(dateStr)}
                          className={`text-xs sm:text-sm py-1 rounded-md ${
                            isSelected
                              ? "bg-blue-700 text-white"
                              : "hover:bg-gray-200"
                          }`}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  {form.date_start && (
                    <div className="mt-3 text-xs text-gray-600">
                      {form.date_end
                        ? `📅 ${formatDateBR(form.date_start)} até ${formatDateBR(form.date_end)}`
                        : `📅 ${formatDateBR(form.date_start)}`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BOTÕES */}
            <div className="col-span-2 flex flex-col sm:flex-row gap-2">
              <button className="bg-blue-700 text-white px-4 py-2 rounded-lg w-full sm:w-auto">
                Salvar
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg w-full sm:w-auto"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
