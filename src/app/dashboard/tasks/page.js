"use client";
import { useSearchParams } from "next/navigation";
import {
  notifyTaskParticipants,
  createNotification,
  extractMentions,
} from "@/lib/notifications";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase";

function TasksContent() {
  const [statusFilter, setStatusFilter] = useState("");
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [justification, setJustification] = useState("");
  const [showJustification, setShowJustification] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        openTask(task);
      } else {
        async function fetchTask() {
          const { data } = await supabase
            .from("tasks")
            .select(
              "*, profiles!tasks_assigned_to_fkey(full_name, avatar_url), sectors(name)",
            )
            .eq("id", taskId)
            .single();
          if (data) {
            setSelectedDate(data.date_start || formatDate(new Date()));
            openTask(data);
          }
        }
        fetchTask();
      }
      // Limpa o parâmetro da URL após abrir a tarefa
      window.history.replaceState({}, "", "/dashboard/tasks");
    }
  }, [searchParams, tasks]);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status && status !== "all") {
      setStatusFilter(status);
    }
  }, [searchParams]);

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
    setIsAdmin(
      profileData?.role === "admin" || profileData?.role === "supervisor",
    );

    let query = supabase
      .from("tasks")
      .select(
        "*, profiles!tasks_assigned_to_fkey(full_name, avatar_url), sectors(name)",
      )
      .lte("date_start", selectedDate)
      .gte("date_end", selectedDate)
      .order("created_at");

    if (profileData?.role === "employee") {
      query = query.contains("assigned_users", [user.id]);
    }

    const { data: tasksData } = await query;
    setTasks(tasksData || []);
  }

  async function openTask(task) {
    setSelectedTask(task);
    setJustification(task.justification || "");
    setShowJustification(false);
    setNewComment("");
    setAttachmentFile(null);

    const { data: commentsData } = await supabase
      .from("comments")
      .select("*, profiles(full_name, avatar_url)")
      .eq("task_id", task.id)
      .order("created_at");
    setComments(commentsData || []);

    const { data: attachmentsData } = await supabase
      .from("attachments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at");
    setAttachments(attachmentsData || []);
  }

  async function handleCheckIn() {
    if (!selectedTask) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isAdminOrSupervisor =
      profileData?.role === "admin" || profileData?.role === "supervisor";
    const newStatus = isAdminOrSupervisor ? "completed" : "waiting_approval";

    await supabase
      .from("tasks")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTask.id);

    await supabase.from("history").insert({
      task_id: selectedTask.id,
      user_id: user.id,
      action: isAdminOrSupervisor
        ? "Tarefa concluída pelo supervisor"
        : "Check-in realizado",
      details: isAdminOrSupervisor
        ? `Tarefa "${selectedTask.title}" concluída e aprovada.`
        : `Tarefa "${selectedTask.title}" marcada como concluída. Aguardando aprovação.`,
    });

    await notifyTaskParticipants({
      task_id: selectedTask.id,
      exclude_user_id: user.id,
      type: isAdminOrSupervisor ? "completed" : "completed",
      message: isAdminOrSupervisor
        ? `${profileData.full_name} concluiu a tarefa "${selectedTask.title}"`
        : `${profileData.full_name} marcou "${selectedTask.title}" como concluída. Aguardando aprovação.`,
    });

    setSelectedTask({ ...selectedTask, status: newStatus });
    loadData();
    setLoading(false);
  }

  async function handleInProgress() {
    if (!selectedTask) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase
      .from("tasks")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", selectedTask.id);

    await supabase.from("history").insert({
      task_id: selectedTask.id,
      user_id: user.id,
      action: "Tarefa em andamento",
      details: `${profileData.full_name} iniciou a tarefa "${selectedTask.title}".`,
    });

    await notifyTaskParticipants({
      task_id: selectedTask.id,
      exclude_user_id: user.id,
      type: "comment",
      message: `${profileData.full_name} iniciou a tarefa "${selectedTask.title}".`,
    });

    setSelectedTask({ ...selectedTask, status: "in_progress" });
    loadData();
    setLoading(false);
  }

  async function handleNotCompleted() {
    if (!selectedTask || !justification.trim()) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase
      .from("tasks")
      .update({
        status: "not_completed",
        justification,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTask.id);

    await supabase.from("history").insert({
      task_id: selectedTask.id,
      user_id: user.id,
      action: "Tarefa não concluída",
      details: `Justificativa: ${justification}`,
    });

    await notifyTaskParticipants({
      task_id: selectedTask.id,
      exclude_user_id: user.id,
      type: "not_completed",
      message: `${profileData.full_name} marcou "${selectedTask.title}" como não concluída.`,
    });

    setSelectedTask({
      ...selectedTask,
      status: "not_completed",
      justification,
    });
    setShowJustification(false);
    loadData();
    setLoading(false);
  }

  async function handleApprove() {
    if (!selectedTask) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase
      .from("tasks")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTask.id);

    await supabase.from("history").insert({
      task_id: selectedTask.id,
      user_id: user.id,
      action: "Tarefa aprovada",
      details: `Tarefa "${selectedTask.title}" aprovada.`,
    });

    await notifyTaskParticipants({
      task_id: selectedTask.id,
      exclude_user_id: user.id,
      type: "approved",
      message: `${profileData.full_name} aprovou a tarefa "${selectedTask.title}"! 🎉`,
    });

    setSelectedTask({ ...selectedTask, status: "completed" });
    loadData();
    setLoading(false);
  }

  async function handleSendComment() {
    if (!newComment.trim() || !selectedTask) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase.from("comments").insert({
      task_id: selectedTask.id,
      user_id: user.id,
      content: newComment.trim(),
    });

    await supabase.from("history").insert({
      task_id: selectedTask.id,
      user_id: user.id,
      action: "Comentário adicionado",
      details: newComment.trim(),
    });

    // Notifica participantes da tarefa
    await notifyTaskParticipants({
      task_id: selectedTask.id,
      exclude_user_id: user.id,
      type: "comment",
      message: `${profileData.full_name} comentou em "${selectedTask.title}": ${newComment.trim().slice(0, 60)}${newComment.length > 60 ? "..." : ""}`,
    });

    // Notifica menções com @
    const mentions = extractMentions(newComment);
    if (mentions.length > 0) {
      const { data: mentionedUsers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "full_name",
          mentions.map((m) => m.replace(/_/g, " ")),
        );

      for (const mentionedUser of mentionedUsers || []) {
        if (mentionedUser.id !== user.id) {
          await createNotification({
            user_id: mentionedUser.id,
            task_id: selectedTask.id,
            type: "mention",
            message: `${profileData.full_name} mencionou você em "${selectedTask.title}"`,
          });
        }
      }
    }

    setNewComment("");
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(full_name, avatar_url)")
      .eq("task_id", selectedTask.id)
      .order("created_at");
    setComments(data || []);
    setLoading(false);
  }

  async function handleAttachment() {
    if (!attachmentFile || !selectedTask) return;
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const fileExt = attachmentFile.name.split(".").pop();
      const fileName = `${selectedTask.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(`tasks/${fileName}`, attachmentFile);

      if (uploadError) {
        alert("Erro no upload: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(`tasks/${fileName}`);

      const { error: insertError } = await supabase.from("attachments").insert({
        task_id: selectedTask.id,
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_name: attachmentFile.name,
      });

      if (insertError) {
        alert("Erro ao salvar anexo: " + insertError.message);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("attachments")
        .select("*")
        .eq("task_id", selectedTask.id)
        .order("created_at");
      setAttachments(data || []);
      setAttachmentFile(null);
    } catch (err) {
      alert("Erro inesperado: " + err.message);
    }

    setLoading(false);
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
    if (status === "waiting_approval") return "Aguardando aprovação";
    if (status === "in_progress") return "Em andamento";
    return "Pendente";
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Lista de tarefas */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Tarefas</h1>
        </div>

        {/* Seletor de data */}
        <div className="flex items-center gap-3 mb-6 bg-white rounded-2xl shadow-sm px-4 py-3">
          <button
            onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setDate(d.getDate() - 1);
              setSelectedDate(formatDate(d));
              setSelectedTask(null);
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-600"
          >
            ←
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedTask(null);
            }}
            className="flex-1 text-center text-sm font-semibold text-gray-700 focus:outline-none"
          />
          <button
            onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setDate(d.getDate() + 1);
              setSelectedDate(formatDate(d));
              setSelectedTask(null);
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-600"
          >
            →
          </button>
          <button
            onClick={() => {
              setSelectedDate(formatDate(new Date()));
              setSelectedTask(null);
            }}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Hoje
          </button>
        </div>

        {/* Cards de tarefas */}
        <div className="space-y-3">
          {tasks
            .filter(
              (t) =>
                !statusFilter ||
                statusFilter === "all" ||
                t.status === statusFilter,
            )
            .map((task) => (
              <div
                key={task.id}
                onClick={() => openTask(task)}
                className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition border-2 ${
                  selectedTask?.id === task.id
                    ? "border-blue-500"
                    : "border-transparent"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{task.title}</p>
                    {task.description && (
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {task.sectors?.name && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {task.sectors.name}
                        </span>
                      )}
                      {isAdmin && task.profiles?.full_name && (
                        <span className="text-xs text-blue-500">
                          👤 {task.profiles.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`ml-3 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge(task.status)}`}
                  >
                    {statusLabel(task.status)}
                  </span>
                </div>
              </div>
            ))}

          {tasks.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
              Nenhuma tarefa para este dia.
            </div>
          )}
        </div>
      </div>

      {/* Painel da tarefa selecionada */}
      {selectedTask && (
        <div className="fixed inset-0 lg:static lg:inset-auto lg:w-96 bg-white lg:rounded-2xl shadow-xl lg:shadow-sm p-6 flex flex-col z-40 overflow-y-auto">
          {/* Cabeçalho */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-bold text-gray-800 text-lg flex-1">
                {selectedTask.title}
              </h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 text-xl flex-shrink-0"
              >
                ✕
              </button>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(selectedTask.status)}`}
            >
              {statusLabel(selectedTask.status)}
            </span>
            {selectedTask.description && (
              <p className="text-gray-500 text-sm mt-3">
                {selectedTask.description}
              </p>
            )}
          </div>

          {/* Funcionário pode concluir ou marcar como não concluída */}
          {(selectedTask.status === "pending" ||
            selectedTask.status === "in_progress") &&
            !isAdmin && (
              <div className="flex flex-col gap-2 mb-4">
                {selectedTask.status === "pending" && (
                  <button
                    onClick={handleInProgress}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    🔄 Iniciar andamento
                  </button>
                )}
                {selectedTask.status === "in_progress" && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    ✅ Concluir
                  </button>
                )}
                <button
                  onClick={() => setShowJustification(!showJustification)}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold py-2 rounded-lg transition"
                >
                  ❌ Não concluída
                </button>
              </div>
            )}

          {/* Admin/supervisor pode concluir diretamente ou marcar como não concluída */}
          {(selectedTask.status === "pending" ||
            selectedTask.status === "in_progress" ||
            selectedTask.status === "waiting_approval" ||
            selectedTask.status === "not_completed") &&
            isAdmin && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={
                    selectedTask.status === "waiting_approval"
                      ? handleApprove
                      : handleCheckIn
                  }
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50"
                >
                  ✅{" "}
                  {selectedTask.status === "waiting_approval"
                    ? "Aprovar"
                    : "Concluir"}
                </button>
                <button
                  onClick={() => setShowJustification(!showJustification)}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold py-2 rounded-lg transition"
                >
                  ❌ Não concluída
                </button>
                {selectedTask.status === "not_completed" && (
                  <button
                    onClick={async () => {
                      setLoading(true);
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      await supabase
                        .from("tasks")
                        .update({
                          status: "pending",
                          justification: null,
                          updated_at: new Date().toISOString(),
                        })
                        .eq("id", selectedTask.id);
                      await supabase.from("history").insert({
                        task_id: selectedTask.id,
                        user_id: user.id,
                        action: "Tarefa reaberta",
                        details: `Tarefa "${selectedTask.title}" reaberta pelo supervisor.`,
                      });
                      setSelectedTask({
                        ...selectedTask,
                        status: "pending",
                        justification: null,
                      });
                      loadData();
                      setLoading(false);
                    }}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    🔄 Reabrir
                  </button>
                )}
              </div>
            )}

          {/* Badge de aguardando aprovação para o funcionário */}
          {selectedTask.status === "waiting_approval" && !isAdmin && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700 font-semibold">
                ⏳ Aguardando aprovação do supervisor
              </p>
            </div>
          )}

          {/* Formulário de justificativa */}
          {showJustification && (
            <div className="mb-4">
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Informe o motivo..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <button
                onClick={handleNotCompleted}
                disabled={loading || !justification.trim()}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          )}

          {/* Justificativa registrada */}
          {selectedTask.justification && (
            <div className="bg-red-50 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-red-600 mb-1">
                Justificativa:
              </p>
              <p className="text-sm text-red-700">
                {selectedTask.justification}
              </p>
            </div>
          )}

          {/* Anexos */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Anexos</p>
            {attachments.length > 0 && (
              <div className="space-y-1 mb-2">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <span>📎</span>
                    <span className="truncate">{att.file_name}</span>
                  </a>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="file"
                onChange={(e) => setAttachmentFile(e.target.files[0])}
                className="text-xs text-gray-500 flex-1"
              />
              {attachmentFile && (
                <button
                  onClick={handleAttachment}
                  disabled={loading}
                  className="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
                >
                  Enviar
                </button>
              )}
            </div>
          </div>

          {/* Comentários */}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Comentários
            </p>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {comment.profiles?.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-700 text-xs font-bold">
                        {comment.profiles?.full_name?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-gray-700">
                      {comment.profiles?.full_name}
                    </p>
                    <p className="text-sm text-gray-600">{comment.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(comment.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-2">
                  Nenhum comentário ainda.
                </p>
              )}
            </div>

            {/* Input de comentário */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                placeholder="Escreva um comentário..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendComment}
                disabled={loading || !newComment.trim()}
                className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg transition disabled:opacity-50"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="text-gray-400 text-sm">Carregando...</p>}>
      <TasksContent />
    </Suspense>
  );
}
