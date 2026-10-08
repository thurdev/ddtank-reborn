# Security — DDTank Reborn

Fase privada: reporta direto ao dono (@thurdev), não abre issue pública.

Quando abrir comunidade:
- Reporte vulnerabilidade por e-mail/DM, nunca em issue/PR público.
- Inclui: versão/commit, passo a passo, impacto (exec remota? vazamento? cheat?).
- Prazo de resposta mirado: 72h. Correção crítica antes de divulgar.
- Nunca commita segredo. `.env.example` é o único lugar de exemplo.
- Flash/Ruffle: trata SWF como não-confiável; validação sempre no servidor.
