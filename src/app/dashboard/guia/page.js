"use client";

import { useState } from "react";

const guia = {
  employee: {
    label: "Funcionário",
    icon: "👤",
    color: "bg-gray-100 text-gray-700",
    active: "bg-gray-700 text-white",
    sections: [
      {
        title: "🏠 Dashboard",
        content: [
          "Ao fazer login, você verá o Dashboard com um resumo das suas tarefas do dia.",
          "Os cards mostram o total de tarefas, concluídas, em andamento, pendentes e não concluídas.",
          "A barra de progresso mostra o percentual de conclusão do dia.",
          'Em "Tarefas de hoje" você vê rapidamente o status de cada tarefa.',
          "Use o botão 🔄 Atualizar para recarregar os dados mais recentes.",
        ],
      },
      {
        title: "✅ Tarefas",
        content: [
          'Acesse o menu "Tarefas" para ver todas as tarefas atribuídas a você.',
          "Use o seletor de data (← →) para navegar entre os dias e ver as tarefas de cada data.",
          "Clique em uma tarefa para abrir os detalhes.",
          'Ao iniciar uma tarefa, clique em 🔄 "Iniciar andamento" — o status muda para Em andamento.',
          'Ao finalizar, clique em ✅ "Concluir" — a tarefa vai para Aguardando aprovação.',
          'Se não conseguir concluir, clique em ❌ "Não concluída" e informe o motivo obrigatoriamente.',
          "Você pode adicionar comentários e anexos dentro de cada tarefa.",
        ],
      },
      {
        title: "🔔 Notificações",
        content: [
          "O sino 🔔 no topo da tela mostra suas notificações.",
          "O número vermelho indica quantas notificações não foram lidas.",
          "Clique no sino para ver a lista de notificações.",
          "Clique em uma notificação para ser redirecionado diretamente para a tarefa.",
          'Use "Marcar todas como lidas" para limpar o contador.',
        ],
      },
      {
        title: "👤 Perfil",
        content: [
          'Acesse "Perfil" no menu para editar seus dados.',
          "Você pode alterar seu nome, cargo e setor.",
          "Para adicionar ou trocar sua foto, clique na área da foto e selecione uma imagem.",
          "O e-mail e o nível de acesso não podem ser alterados por você.",
          'Para alterar sua senha, use a opção "Esqueci minha senha" na tela de login.',
        ],
      },
      {
        title: "📋 Manual de Intercorrências",
        content: [
          "O Manual de Intercorrências contém orientações para situações específicas do dia a dia.",
          'Acesse pelo menu lateral em "Manual".',
          "Selecione a categoria desejada para ver os artigos disponíveis.",
          "Clique em um artigo para ler as orientações completas.",
        ],
      },
    ],
  },
  supervisor: {
    label: "Supervisor",
    icon: "🔵",
    color: "bg-blue-100 text-blue-700",
    active: "bg-blue-700 text-white",
    sections: [
      {
        title: "🏠 Dashboard",
        content: [
          "O supervisor visualiza o dashboard completo com dados de todos os funcionários do seu setor.",
          'Em "Desempenho de hoje" você vê o ranking dos 3 funcionários com mais tarefas concluídas.',
          "O gráfico de produtividade mostra os últimos 5 dias úteis com concluídas, pendentes e não concluídas.",
          "O painel de alertas destaca tarefas aguardando aprovação, sem justificativa e atrasadas.",
        ],
      },
      {
        title: "✅ Tarefas",
        content: [
          "O supervisor vê todas as tarefas do setor, não apenas as suas.",
          'Tarefas marcadas como concluídas pelo funcionário ficam com status "Aguardando aprovação".',
          'Clique na tarefa e depois em ✅ "Aprovar" para concluir oficialmente.',
          "É possível concluir uma tarefa diretamente sem precisar que o funcionário conclua primeiro.",
          'Tarefas "Não concluídas" podem ser reabertas clicando em 🔄 "Reabrir".',
        ],
      },
      {
        title: "⚙️ Gerenciar Tarefas",
        content: [
          'Acesse "Gerenciar" no menu para criar, editar e excluir tarefas.',
          "Ao criar uma tarefa, selecione a data de início e fim clicando no calendário.",
          "Para tarefas de um único dia, clique apenas na data desejada.",
          "Para tarefas com período, clique na data de início e depois na data de fim.",
          "Você pode selecionar múltiplos responsáveis para uma mesma tarefa.",
          'Também é possível criar e gerenciar setores pelo botão "+ Setor".',
        ],
      },
      {
        title: "👥 Usuários",
        content: [
          "O supervisor visualiza e gerencia apenas os funcionários do seu setor.",
          'É possível criar novos funcionários clicando em "+ Novo usuário".',
          "Supervisores não podem alterar o nível de acesso nem excluir usuários.",
          "Ao criar um usuário, o setor já é preenchido automaticamente com o seu setor.",
        ],
      },
      {
        title: "📋 Manual de Intercorrências",
        content: [
          "O supervisor pode criar, editar e excluir categorias e artigos do manual.",
          'Clique em "+ Categoria" para adicionar uma nova categoria com nome e ícone.',
          'Selecione uma categoria e clique em "+ Artigo" para adicionar uma orientação.',
          "Os artigos ficam visíveis para todos os funcionários.",
        ],
      },
      {
        title: "📄 Relatórios",
        content: [
          'Clique em "Relatório ▾" no dashboard para gerar relatórios em PDF.',
          "Relatório Diário: tarefas do dia atual.",
          "Relatório Semanal: tarefas de segunda a domingo da semana atual.",
          "Relatório Mensal: todas as tarefas do mês atual.",
        ],
      },
    ],
  },
  admin: {
    label: "Administrador",
    icon: "🟣",
    color: "bg-purple-100 text-purple-700",
    active: "bg-purple-700 text-white",
    sections: [
      {
        title: "🏠 Dashboard",
        content: [
          "O administrador tem visão completa de todos os setores e funcionários.",
          "Todos os cards, gráficos e desempenho exibem dados de toda a empresa.",
          "O painel de alertas mostra tarefas aguardando aprovação, sem justificativa, sem responsável e atrasadas.",
        ],
      },
      {
        title: "✅ Tarefas",
        content: [
          "O administrador vê todas as tarefas de todos os setores.",
          "Pode aprovar, reabrir, concluir ou marcar como não concluída qualquer tarefa.",
          "Tem acesso ao histórico completo de ações dentro de cada tarefa.",
        ],
      },
      {
        title: "⚙️ Gerenciar Tarefas",
        content: [
          "Acesso completo para criar, editar e excluir qualquer tarefa ou setor.",
          "Ao criar uma tarefa, selecione a data clicando no calendário — um clique para dia único, dois cliques para período.",
          "Selecione um ou mais responsáveis para cada tarefa.",
          'Gerencie os setores da empresa pelo botão "+ Setor".',
        ],
      },
      {
        title: "👥 Usuários",
        content: [
          "O administrador visualiza todos os usuários da plataforma.",
          "Pode criar usuários de qualquer nível: Funcionário, Supervisor ou Administrador.",
          "Pode editar dados, alterar nível de acesso e setor de qualquer usuário.",
          "Apenas o administrador pode excluir usuários — exceto a própria conta.",
        ],
      },
      {
        title: "📊 Histórico",
        content: [
          'Acesse "Histórico" no menu para ver todas as ações realizadas na plataforma.',
          "Filtre por usuário ou tipo de ação para encontrar registros específicos.",
          "O histórico registra: criação, edição, conclusão, aprovação, reabertura e comentários.",
        ],
      },
      {
        title: "📋 Manual de Intercorrências",
        content: [
          "Controle total sobre categorias e artigos do manual.",
          "Crie categorias com nome e ícone personalizado.",
          "Adicione artigos com título e conteúdo detalhado em cada categoria.",
          "Edite ou exclua qualquer categoria ou artigo a qualquer momento.",
        ],
      },
      {
        title: "📄 Relatórios",
        content: [
          "Gere relatórios em PDF diretamente pelo dashboard.",
          "Relatório Diário: resumo e lista de tarefas do dia.",
          "Relatório Semanal: visão geral da semana de segunda a domingo.",
          "Relatório Mensal: consolidado completo do mês.",
          "Todos os relatórios incluem resumo de status e desempenho por funcionário.",
        ],
      },
    ],
  },
};

export default function GuiaPage() {
  const [perfil, setPerfil] = useState("employee");
  const [aberta, setAberta] = useState(null);

  const atual = guia[perfil];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          📖 Guia de Uso
        </h1>
        <p className="text-gray-500 text-sm">
          Aprenda a usar cada funcionalidade da plataforma.
        </p>
      </div>

      {/* Seletor de perfil */}
      <div className="flex gap-2 mb-6">
        {Object.entries(guia).map(([key, val]) => (
          <button
            key={key}
            onClick={() => {
              setPerfil(key);
              setAberta(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${perfil === key ? val.active : val.color}`}
          >
            {val.icon} {val.label}
          </button>
        ))}
      </div>

      {/* Seções */}
      <div className="space-y-3">
        {atual.sections.map((section, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setAberta(aberta === idx ? null : idx)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <p className="font-semibold text-gray-800 text-sm">
                {section.title}
              </p>
              <span className="text-gray-400 text-lg">
                {aberta === idx ? "▲" : "▼"}
              </span>
            </button>
            {aberta === idx && (
              <div className="px-5 pb-5 space-y-2 border-t border-gray-50">
                {section.content.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 pt-2">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <p className="text-sm text-gray-600">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
