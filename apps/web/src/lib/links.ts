/**
 * External links used across the site (site-admin-redesign, rodada 4). Centralizado aqui — não em
 * `pages/Apoiar.tsx` — porque o footer (`SiteLayout.tsx`, carregado em toda página) precisaria importar o
 * chunk inteiro da página Apoiar (lazy-loaded) só pra pegar uma constante, o que quebraria o code-splitting.
 */
export const GITHUB_URL = "https://github.com/thurdev/ddtank-reborn";
/** Vídeo oficial do projeto (seção "Trailer" da Home). */
export const TRAILER_YOUTUBE_ID = "Jkr7ADRN_kw";
/** Mesmo link usado em `pages/Apoiar.tsx` (`BUY_ME_A_COFFEE_URL`) — ver o comentário lá pra por que BMC
 *  (não Pix) é o canal oficial de doação deste projeto. */
export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/3vdopcs";
