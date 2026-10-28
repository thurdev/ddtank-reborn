import { createRequire } from "node:module";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// srcDir (docs/guia-dev) fica FORA de apps/docs — a resolução padrão de "vue"/"vue/server-renderer" do
// VitePress sobe a partir do arquivo .md sendo processado e nunca alcança apps/docs/node_modules (não é
// ancestral de docs/guia-dev). O VitePress já resolve isso por conta própria no build do CLIENTE (alias
// condicional a `!ssr` em cima de `root`), mas não no build do SERVIDOR (SSR) — por isso o alias manual
// abaixo, resolvido a partir DESTE arquivo (sempre dentro de apps/docs/node_modules), cobrindo os dois.
const require = createRequire(import.meta.url);
const vueRuntimePath = require.resolve("vue/dist/vue.runtime.esm-bundler.js");
const vueServerRendererPath = require.resolve("vue/server-renderer");

const EDIT_LINK_PATTERN = "https://github.com/thurdev/ddtank-reborn/edit/main/docs/guia-dev/:path";

const sidebarReceitas = [
  { text: "Como achar qualquer coisa", link: "/04-receitas/como-achar-qualquer-coisa" },
  { text: "Trocar ícone/imagem", link: "/04-receitas/trocar-icone-imagem" },
  { text: "Adicionar ícone/imagem nova", link: "/04-receitas/adicionar-icone-imagem-nova" },
  { text: "Criar item", link: "/04-receitas/criar-item" },
  { text: "Funções de um item", link: "/04-receitas/itens-funcoes" },
  { text: "Item com menu e ação", link: "/04-receitas/item-com-menu-e-acao" },
  { text: "Totem, mascote e sistemas", link: "/04-receitas/totem-mascote-e-sistemas" },
  { text: "Animações", link: "/04-receitas/animacoes" },
  { text: "Dar coisas ao jogador", link: "/04-receitas/dar-coisas-ao-jogador" },
  { text: "Novo pacote", link: "/04-receitas/novo-pacote" },
  { text: "Nova tela no cliente", link: "/04-receitas/nova-tela-cliente" },
  { text: "Salas", link: "/04-receitas/salas" },
  { text: "Instâncias PvE", link: "/04-receitas/instancias" },
  { text: "Eventos", link: "/04-receitas/eventos" },
  { text: "Missões/quests", link: "/04-receitas/missoes-quests" },
  { text: "Textos e traduções", link: "/04-receitas/traducoes" },
  { text: "Testes", link: "/04-receitas/testes" },
  { text: "Debug", link: "/04-receitas/debug" },
  { text: "Migrações de banco", link: "/04-receitas/migracoes-banco" },
];

export default withMermaid(
  defineConfig({
    title: "DDTank Reborn — Guia do Desenvolvedor",
    description: "Guia prático para manter e evoluir o DDTank Reborn: itens, animações, pacotes, salas, instâncias, eventos e debug.",
    lang: "pt-BR",
    base: "/ddtank-reborn/",
    srcDir: "../../docs/guia-dev",
    appearance: "dark",
    cleanUrls: true,
    lastUpdated: true,

    // Links reais do guia-dev pra fora de docs/guia-dev/** (docs/features, docs/client-pixi, docs/guides,
    // docs/GAME-SERVER.md, docs/API.md, apps/game/HANDLERS.md...) — válidos no repo/GitHub, fora do srcDir
    // deste site (que só publica docs/guia-dev/**), então o checker de link morto do VitePress não alcança.
    ignoreDeadLinks: [
      /\.\.\/features\//,
      /\.\.\/client-pixi\//,
      /\.\.\/guides\//,
      /\.\.\/qa\//,
      /\.\.\/GAME-SERVER/,
      /\.\.\/API$/,
      /\.\.\/\.\.\/apps\/game\/HANDLERS/,
    ],

    head: [
      ["link", { rel: "icon", href: "/ddtank-reborn/logo.webp" }],
      ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
      ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
      ["link", { href: "https://fonts.googleapis.com/css2?family=Lilita+One&family=Rubik:wght@400;500;600;700&display=swap", rel: "stylesheet" }],
    ],

    themeConfig: {
      logo: "/logo.webp",
      siteTitle: "DDTank Reborn — Guia do Dev",

      nav: [
        { text: "Começar", link: "/01-comecar" },
        { text: "Arquitetura", link: "/02-arquitetura" },
        { text: "API", link: "/03-api-referencia" },
        { text: "Receitas", link: "/04-receitas/como-achar-qualquer-coisa" },
        { text: "Tutorial", link: "/05-tutorial-bugou-normal" },
        { text: "Glossário", link: "/06-glossario" },
      ],

      sidebar: [
        {
          text: "Começar",
          items: [
            { text: "Comece aqui", link: "/README" },
            { text: "Subir, logar, debugar", link: "/01-comecar" },
          ],
        },
        {
          text: "Arquitetura",
          items: [{ text: "As peças e o caminho de um clique", link: "/02-arquitetura" }],
        },
        {
          text: "Referência da API",
          items: [{ text: "APIs do servidor (estilo Javadoc)", link: "/03-api-referencia" }],
        },
        {
          text: "Receitas",
          collapsed: false,
          items: sidebarReceitas,
        },
        {
          text: "Tutorial",
          items: [{ text: "Castelo do Bugou (Pve 1) — Normal", link: "/05-tutorial-bugou-normal" }],
        },
        {
          text: "Glossário",
          items: [{ text: "Termos PT-BR/VN/CN/código", link: "/06-glossario" }],
        },
      ],

      search: {
        provider: "local",
        options: {
          translations: {
            button: { buttonText: "Buscar", buttonAriaLabel: "Buscar" },
            modal: {
              displayDetails: "Mostrar detalhes",
              resetButtonTitle: "Limpar busca",
              backButtonTitle: "Fechar busca",
              noResultsText: "Nenhum resultado para",
              footer: {
                selectText: "selecionar",
                selectKeyAriaLabel: "enter",
                navigateText: "navegar",
                navigateUpKeyAriaLabel: "seta para cima",
                navigateDownKeyAriaLabel: "seta para baixo",
                closeText: "fechar",
                closeKeyAriaLabel: "esc",
              },
            },
          },
        },
      },

      editLink: {
        pattern: EDIT_LINK_PATTERN,
        text: "Editar esta página no GitHub",
      },

      outline: {
        label: "Nesta página",
      },

      docFooter: {
        prev: "Página anterior",
        next: "Próxima página",
      },

      returnToTopLabel: "Voltar ao topo",
      sidebarMenuLabel: "Menu",
      darkModeSwitchLabel: "Aparência",
      lightModeSwitchTitle: "Mudar para tema claro",
      darkModeSwitchTitle: "Mudar para tema escuro",
      lastUpdatedText: "Última atualização",

      socialLinks: [{ icon: "github", link: "https://github.com/thurdev/ddtank-reborn" }],

      footer: {
        message: "100% open source — sem vantagem paga, créditos a todo trabalho de base.",
        copyright: "DDTank Reborn",
      },
    },

    mermaid: {
      theme: "dark",
    },

    markdown: {
      theme: { light: "github-light", dark: "github-dark" },
    },

    vite: {
      resolve: {
        alias: [
          { find: /^vue$/, replacement: vueRuntimePath },
          { find: /^vue\/server-renderer$/, replacement: vueServerRendererPath },
        ],
      },
    },
  }),
);
