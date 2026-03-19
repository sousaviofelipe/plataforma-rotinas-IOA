"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export default function ManualPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Formulários
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", icon: "📋" });
  const [articleForm, setArticleForm] = useState({
    title: "",
    content: "",
    category_id: "",
  });

  const ICONS = ["📋", "🏥", "🎓", "📞", "🔧", "📝", "⚠️", "✅", "🏢", "💊"];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(profileData);
    setIsAdmin(
      profileData?.role === "admin" || profileData?.role === "supervisor",
    );

    const { data: cats } = await supabase
      .from("manual_categories")
      .select("*")
      .order("created_at", { ascending: true });
    setCategories(cats || []);

    const { data: arts } = await supabase
      .from("manual_articles")
      .select("*")
      .order("created_at", { ascending: true });
    setArticles(arts || []);

    if (cats && cats.length > 0) setSelectedCategory(cats[0]);
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (editingCategory) {
      const { error } = await supabase
        .from("manual_categories")
        .update({ name: categoryForm.name, icon: categoryForm.icon })
        .eq("id", editingCategory.id);
      if (error) {
        setError("Erro ao atualizar categoria.");
      } else {
        setSuccess("Categoria atualizada!");
      }
    } else {
      const { error } = await supabase.from("manual_categories").insert({
        name: categoryForm.name,
        icon: categoryForm.icon,
        created_by: user.id,
      });
      if (error) {
        setError("Erro ao criar categoria.");
      } else {
        setSuccess("Categoria criada!");
      }
    }

    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm({ name: "", icon: "📋" });
    setLoading(false);
    loadData();
  }

  async function handleDeleteCategory(id) {
    if (!confirm("Excluir categoria e todos os artigos dela?")) return;
    await supabase.from("manual_categories").delete().eq("id", id);
    setSelectedCategory(null);
    loadData();
  }

  async function handleSaveArticle(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (editingArticle) {
      const { error } = await supabase
        .from("manual_articles")
        .update({
          title: articleForm.title,
          content: articleForm.content,
          category_id: articleForm.category_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingArticle.id);
      if (error) {
        setError("Erro ao atualizar artigo.");
      } else {
        setSuccess("Artigo atualizado!");
      }
    } else {
      const { error } = await supabase.from("manual_articles").insert({
        title: articleForm.title,
        content: articleForm.content,
        category_id: articleForm.category_id || selectedCategory?.id,
        created_by: user.id,
      });
      if (error) {
        setError("Erro ao criar artigo.");
      } else {
        setSuccess("Artigo criado!");
      }
    }

    setShowArticleForm(false);
    setEditingArticle(null);
    setArticleForm({ title: "", content: "", category_id: "" });
    setLoading(false);
    loadData();
  }

  async function handleDeleteArticle(id) {
    if (!confirm("Excluir este artigo?")) return;
    await supabase.from("manual_articles").delete().eq("id", id);
    setSelectedArticle(null);
    loadData();
  }

  const filteredArticles = articles.filter(
    (a) => a.category_id === selectedCategory?.id,
  );

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">
            📋 Manual de Intercorrências
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Consulte orientações para situações específicas
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCategoryForm(true);
                setEditingCategory(null);
                setCategoryForm({ name: "", icon: "📋" });
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-2 rounded-xl transition"
            >
              + Categoria
            </button>
            <button
              onClick={() => {
                setShowArticleForm(true);
                setEditingArticle(null);
                setArticleForm({
                  title: "",
                  content: "",
                  category_id: selectedCategory?.id || "",
                });
              }}
              className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-3 py-2 rounded-xl transition"
            >
              + Artigo
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">
          {success}
        </div>
      )}

      {/* Modal Categoria */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-800 mb-4">
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </h2>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Clínica, Recepção..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ícone
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, icon })}
                      className={`text-xl p-2 rounded-lg transition ${categoryForm.icon === icon ? "bg-blue-100 ring-2 ring-blue-500" : "bg-gray-100 hover:bg-gray-200"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Artigo */}
      {showArticleForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="font-bold text-gray-800 mb-4">
              {editingArticle ? "Editar Artigo" : "Novo Artigo"}
            </h2>
            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={articleForm.category_id || selectedCategory?.id}
                  onChange={(e) =>
                    setArticleForm({
                      ...articleForm,
                      category_id: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <input
                  value={articleForm.title}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, title: e.target.value })
                  }
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: O que fazer quando o paciente desmaia?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conteúdo
                </label>
                <textarea
                  value={articleForm.content}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, content: e.target.value })
                  }
                  required
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Descreva o passo a passo..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowArticleForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 text-sm">
            Nenhuma categoria cadastrada ainda.
          </p>
          {isAdmin && (
            <p className="text-gray-400 text-xs mt-1">
              Clique em "+ Categoria" para começar.
            </p>
          )}
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Sidebar de categorias */}
          <div className="w-40 lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-2x1 shadow-sm overflow-hidden">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedArticle(null);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition flex items-center gap-2 ${selectedCategory?.id === cat.id ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                  {isAdmin && selectedCategory?.id === cat.id && (
                    <div className="flex border-t border-blue-600">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({ name: cat.name, icon: cat.icon });
                          setShowCategoryForm(true);
                        }}
                        className="flex-1 text-xs text-blue-500 hover:bg-blue-800 py-1.5 transition"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="flex-1 text-xs text-blue-500 hover:bg-blue-800 py-1.5 transition border-l border-blue-600"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lista de artigos */}
          <div className="flex-1">
            {selectedArticle ? (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1"
                >
                  ← Voltar
                </button>
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">
                    {selectedArticle.title}
                  </h2>
                  {isAdmin && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingArticle(selectedArticle);
                          setArticleForm({
                            title: selectedArticle.title,
                            content: selectedArticle.content,
                            category_id: selectedArticle.category_id,
                          });
                          setShowArticleForm(true);
                        }}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDeleteArticle(selectedArticle.id)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedArticle.content}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowArticleForm(true);
                      setEditingArticle(null);
                      setArticleForm({
                        title: "",
                        content: "",
                        category_id: selectedCategory?.id || "",
                      });
                    }}
                    className="w-full bg-white border-2 border-dashed border-blue-200 hover:border-blue-400 text-blue-500 text-sm font-medium py-3 rounded-2xl transition"
                  >
                    + Novo artigo {selectedCategory?.icon}{" "}
                    {selectedCategory?.name}
                  </button>
                )}
                {filteredArticles.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                    <p className="text-gray-400 text-sm">
                      Nenhum artigo nesta categoria ainda.
                    </p>
                  </div>
                ) : (
                  filteredArticles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="w-full bg-white rounded-2xl shadow-sm p-4 text-left hover:shadow-md transition"
                    >
                      <p className="font-semibold text-gray-800 text-sm">
                        {article.title}
                      </p>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                        {article.content}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
