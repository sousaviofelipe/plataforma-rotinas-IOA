import { createClient } from "./supabase";

const supabase = createClient();

export async function createNotification({ user_id, task_id, type, message }) {
  await supabase
    .from("notifications")
    .insert({ user_id, task_id, type, message });
}

export async function notifyTaskParticipants({
  task_id,
  exclude_user_id,
  type,
  message,
}) {
  // Busca todos os usuários envolvidos na tarefa (responsável, criador, comentadores)
  const { data: task } = await supabase
    .from("tasks")
    .select("assigned_to, created_by")
    .eq("id", task_id)
    .single();

  const { data: commenters } = await supabase
    .from("comments")
    .select("user_id")
    .eq("task_id", task_id);

  const userIds = new Set();
  if (task?.assigned_to) userIds.add(task.assigned_to);
  if (task?.created_by) userIds.add(task.created_by);
  commenters?.forEach((c) => userIds.add(c.user_id));
  userIds.delete(exclude_user_id);

  for (const user_id of userIds) {
    await createNotification({ user_id, task_id, type, message });
  }
}

export function extractMentions(text) {
  const matches = text.match(/@(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}
