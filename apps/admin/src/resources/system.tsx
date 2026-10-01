import { Languages, Mail, Megaphone, Newspaper, ScrollText, UserCog } from "lucide-react";
import { defineResource } from "@/crud/types";

export const texts = defineResource({
  name: "texts",
  label: { "pt-BR": "Textos e traduções", en: "Texts & translations" },
  singular: { "pt-BR": "texto", en: "text" },
  description: "Strings de idioma do cliente (language.txt). Edite a tradução por chave.",
  icon: Languages,
  group: "server",
  idField: "key",
  titleField: "key",
  defaultSort: "key",
  pageSize: 50,
  searchPlaceholder: "Chave ou texto…",
  fields: [
    { name: "key", label: "Chave", type: "text", required: true, list: true, sortable: true, form: "create", span: 2, render: (v) => <code className="font-mono text-xs text-sky">{String(v)}</code> },
    { name: "group", label: "Grupo", type: "text", list: true, sortable: true, hint: "Prefixo do módulo (ex.: ddt.game)" },
    { name: "ptBR", label: "Português (BR)", type: "textarea", required: true, list: true },
    { name: "en", label: "English", type: "textarea", list: true },
  ],
});

export const news = defineResource({
  name: "news",
  label: { "pt-BR": "Notícias", en: "News" },
  singular: { "pt-BR": "notícia", en: "news post" },
  description: "Publicações exibidas na página inicial do site.",
  icon: Newspaper,
  group: "site",
  idField: "id",
  titleField: "title",
  defaultSort: "-publishedAt",
  fields: [
    { name: "id", label: "ID", type: "number", form: false },
    { name: "cover", label: "Capa", type: "image", uploadFolder: "images/news" },
    { name: "title", label: "Título", type: "text", required: true, maxLength: 120, list: true, sortable: true, span: 2 },
    {
      name: "category",
      label: "Categoria",
      type: "select",
      required: true,
      list: true,
      options: [
        { value: "news", label: "Novidade", tone: "mint" },
        { value: "update", label: "Atualização", tone: "sky" },
        { value: "event", label: "Evento", tone: "sun" },
        { value: "maintenance", label: "Manutenção", tone: "coral" },
      ],
    },
    { name: "publishedAt", label: "Publicar em", type: "datetime", required: true, list: true, sortable: true },
    { name: "summary", label: "Resumo", type: "textarea", required: true, maxLength: 280 },
    { name: "body", label: "Conteúdo (Markdown)", type: "textarea" },
    { name: "published", label: "Publicada", type: "boolean", default: true, list: true, inlineToggle: true },
  ],
});

export const edicts = defineResource({
  name: "edicts",
  table: 'game."Edictum_List"',
  label: { "pt-BR": "Avisos do jogo", en: "In-game notices" },
  singular: { "pt-BR": "aviso", en: "notice" },
  description: "Comunicados exibidos dentro do cliente (Edictum_List).",
  icon: Megaphone,
  group: "site",
  idField: "ID",
  titleField: "Title",
  defaultSort: "-BeginDate",
  fields: [
    { name: "ID", label: "ID", type: "number", list: true, sortable: true, required: true, form: "create" },
    { name: "Title", label: "Título", type: "text", required: true, list: true, sortable: true, span: 2 },
    { name: "BeginDate", label: "Data início", type: "datetime", required: true, list: true, sortable: true },
    { name: "BeginTime", label: "Hora início", type: "datetime", required: true },
    { name: "EndDate", label: "Data fim", type: "datetime", required: true, list: true },
    { name: "EndTime", label: "Hora fim", type: "datetime", required: true },
    { name: "Text", label: "Texto", type: "textarea", required: true },
    { name: "IsExist", label: "Ativo", type: "boolean", default: true, list: true, inlineToggle: true },
  ],
});

export const logs = defineResource({
  name: "logs",
  label: { "pt-BR": "Logs", en: "Logs" },
  singular: { "pt-BR": "log", en: "log" },
  description: "Ações administrativas, transações e eventos do servidor.",
  icon: ScrollText,
  group: "overview",
  idField: "id",
  titleField: "id",
  defaultSort: "-at",
  pageSize: 50,
  capabilities: { create: false, update: false, delete: false },
  fields: [
    { name: "at", label: "Quando", type: "datetime", list: true, sortable: true },
    {
      name: "level",
      label: "Nível",
      type: "select",
      list: true,
      sortable: true,
      options: [
        { value: "info", label: "info", tone: "sky" },
        { value: "warn", label: "aviso", tone: "sun" },
        { value: "error", label: "erro", tone: "coral" },
      ],
    },
    { name: "category", label: "Categoria", type: "text", list: true, sortable: true },
    { name: "actor", label: "Autor", type: "text", list: true },
    { name: "message", label: "Mensagem", type: "text", list: true },
  ],
});

export const adminUsers = defineResource({
  name: "admin-users",
  label: { "pt-BR": "Administradores", en: "Admin users" },
  singular: { "pt-BR": "administrador", en: "admin user" },
  description: "Contas com acesso ao painel.",
  icon: UserCog,
  group: "system",
  idField: "id",
  titleField: "username",
  defaultSort: "username",
  fields: [
    { name: "id", label: "ID", type: "number", list: true, form: false },
    { name: "username", label: "Usuário", type: "text", required: true, pattern: /^[a-z0-9_.]{3,32}$/, patternMessage: "3–32 letras minúsculas, números, _ ou .", list: true, sortable: true },
    { name: "email", label: "E-mail", type: "text", required: true, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, patternMessage: "E-mail inválido", list: true },
    {
      name: "role",
      label: "Papel",
      type: "select",
      required: true,
      list: true,
      options: [
        { value: "admin", label: "Administrador", tone: "sun" },
        { value: "gm", label: "GM (moderador)", tone: "sky" },
      ],
      hint: "Somente 'admin' acessa este painel.",
    },
    { name: "password", label: "Senha", type: "password", required: true },
    { name: "active", label: "Ativo", type: "boolean", default: true, list: true, inlineToggle: true },
    { name: "lastLoginAt", label: "Último acesso", type: "datetime", list: true, readOnly: true, form: "edit" },
  ],
});

export const mailBroadcasts = defineResource({
  name: "mail-broadcasts",
  label: { "pt-BR": "Envios de correio", en: "Mail sends" },
  singular: { "pt-BR": "envio", en: "send" },
  icon: Mail,
  group: "players",
  hidden: true,
  idField: "id",
  titleField: "subject",
  defaultSort: "-sentAt",
  capabilities: { create: false, update: false, delete: false },
  fields: [
    { name: "sentAt", label: "Enviado em", type: "datetime", list: true, sortable: true },
    { name: "subject", label: "Assunto", type: "text", list: true },
    { name: "target", label: "Destino", type: "text", list: true },
    { name: "recipients", label: "Destinatários", type: "number", list: true },
    { name: "sentBy", label: "Por", type: "text", list: true },
  ],
});
