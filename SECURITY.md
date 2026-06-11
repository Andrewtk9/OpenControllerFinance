# Política de Segurança — OpenControllerFinance

> **Princípio do projeto:** seus dados financeiros pertencem a você e ficam na sua máquina.
> Este documento descreve o modelo de ameaças, as garantias de privacidade, exatamente quais
> conexões de rede o app faz e as boas práticas recomendadas para operar com segurança.

---

## 1. Modelo de ameaças

### O que o app protege

| Ativo | Onde fica | Sensibilidade |
| --- | --- | --- |
| Transações, saldos, faturas, limites de cartão | `prisma/dev.db` (SQLite local) | Alta — dados financeiros pessoais |
| Credenciais da Pluggy (`PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`) | `.env` local (nunca commitado) | Alta — dão acesso de leitura aos seus dados bancários via API |
| IDs de conexão Open Finance (`PLUGGY_ITEM_IDS`) | `.env` local | Média — inúteis sem o client secret |
| Token do bot do Telegram (opcional) | `.env` local | Média — permite enviar mensagens pelo seu bot |

### Do que o app protege

- **Vazamento para a nuvem**: não há backend remoto, telemetria de uso, analytics, crash
  reporting nem qualquer serviço de terceiros recebendo seus dados. O dashboard lê apenas o
  SQLite local.
- **Vazamento via repositório Git**: `.env*` (exceto `.env.example`), `*.db`, `*.sqlite` e
  journals estão no `.gitignore`. O histórico do repositório foi auditado e **nunca conteve**
  `.env` ou arquivos de banco.
- **Credenciais bancárias**: o app **nunca vê sua senha do banco**. O consentimento do Open
  Finance é aprovado dentro do app do próprio banco (regulado pelo Banco Central) e pode ser
  **revogado a qualquer momento** no app do banco ou no MeuPluggy.

### O que está FORA do modelo de ameaças (responsabilidade do usuário/SO)

- Atacante com acesso físico ou conta de usuário na sua máquina (ele lê o `dev.db` e o `.env`
  diretamente — use criptografia de disco, ex.: BitLocker/FileVault/LUKS).
- Comprometimento da própria Pluggy ou do Telegram (terceiros fora do nosso controle).
- Exposição deliberada da porta do app na rede/internet (veja a seção 4 — o app **não tem
  autenticação** e foi desenhado para uso local, single-user).

---

## 2. Garantias

1. **Dados só na sua máquina.** Tudo é gravado em `prisma/dev.db` (SQLite). Nenhum dado
   financeiro é enviado a servidores próprios — o projeto não possui servidores.
2. **SQLite fora do Git.** `*.db`, `*.db-journal`, `*.sqlite`, `*.sqlite3` são ignorados pelo
   versionamento.
3. **Credenciais só em `.env` local.** Não há segredos hardcoded no código. O `.env` é ignorado
   pelo Git; apenas o `.env.example` (sem valores) é versionado.
4. **Consentimento revogável.** A conexão Open Finance pode ser revogada no app do seu banco a
   qualquer momento; ao revogar, a Pluggy perde acesso e o sync para de receber dados novos.
5. **Sem telemetria do app.** O código não contém analytics, beacons ou coleta de uso.
   *Observação:* o framework Next.js coleta telemetria **anônima** de build por padrão —
   recomendamos desativar com `NEXT_TELEMETRY_DISABLED=1` (veja a seção 4).
6. **Sem SQL cru e sem HTML cru.** Todo acesso ao banco usa Prisma (queries parametrizadas) e
   toda renderização usa React (escape automático) — não há `$queryRaw` nem
   `dangerouslySetInnerHTML` no código.

---

## 3. As únicas conexões de saída

O app faz **exatamente duas** conexões de rede em runtime, ambas via HTTPS:

### 3.1 `api.pluggy.ai` (obrigatória para o sync)

- **Quando:** apenas ao rodar `npm run sync` (script manual ou agendado).
- **O que sai da máquina:** seu `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET` (autenticação) e os
  `itemIds`/`accountIds` consultados.
- **O que entra:** contas, saldos, transações e faturas — gravados no SQLite local.
- Nenhum dado local seu (categorias, regras, orçamento, notificações) é enviado à Pluggy; o
  fluxo é somente de leitura dos dados bancários.

### 3.2 `api.telegram.org` (opcional — só se você configurar)

- **Quando:** durante o `npm run sync`, somente se `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`
  estiverem preenchidos no `.env`. Sem essas variáveis, **nenhuma conexão ao Telegram ocorre**.
- **O que sai da máquina (conteúdo das mensagens de alerta):**
  - total gasto no mês e % do orçamento usado (alertas de orçamento);
  - nome do banco, valor e data de vencimento da fatura (alertas de fatura).
- **O que NÃO sai:** descrições de transações individuais, números de conta, saldos detalhados
  ou credenciais.
- **Atenção:** chats de bot do Telegram **não têm criptografia ponta-a-ponta** — o conteúdo dos
  alertas (valores agregados) fica visível para a infraestrutura do Telegram. Se isso for
  inaceitável para você, simplesmente não configure o Telegram.

Conexões de **build/desenvolvimento** (sem dados do usuário): download de pacotes do npm,
download das fontes Geist (Google Fonts) em build time — as fontes são servidas localmente em
runtime — e a telemetria anônima do Next.js (desativável).

---

## 4. Boas práticas para o usuário

1. **Não exponha a porta.** O app **não tem login/senha** — qualquer pessoa que alcançar a
   porta lê e altera seus dados. Rode o dashboard escutando **apenas em localhost**:

   ```bash
   npm run dev -- -H 127.0.0.1
   # ou em produção:
   npm run build && npx next start -H 127.0.0.1
   ```

   Não faça port-forward, não use `-H 0.0.0.0` e não publique atrás de um túnel/reverse proxy
   sem colocar autenticação na frente (ex.: Basic Auth no proxy, Tailscale, VPN).
2. **Desative a telemetria do Next.js:**

   ```bash
   npx next telemetry disable
   # ou adicione ao .env: NEXT_TELEMETRY_DISABLED=1
   ```

3. **Proteja o `.env`.** Nunca o copie para pastas sincronizadas (Drive/Dropbox/OneDrive) sem
   criptografia e nunca o cole em issues, prints ou chats.
4. **Backup criptografado do banco.** O `prisma/dev.db` contém todo o seu histórico financeiro
   em texto claro. Para backup, criptografe antes de enviar para qualquer nuvem, ex.:

   ```bash
   # com 7-Zip (Windows/Linux/macOS)
   7z a -p -mhe=on backup-finance.7z prisma/dev.db
   # ou com age/gpg
   gpg -c prisma/dev.db
   ```

5. **Revogue consentimentos não usados.** Se parar de usar o app ou remover um banco, revogue o
   consentimento no app do banco e exclua o item no MeuPluggy/dashboard da Pluggy.
6. **Rotacione segredos se houver suspeita.** Client secret da Pluggy pode ser regenerado no
   dashboard; token do bot do Telegram pode ser revogado no @BotFather (`/revoke`).
7. **Mantenha as dependências atualizadas.** Rode `npm audit` periodicamente e atualize o
   Next.js quando houver correções de segurança.
8. **Use disco criptografado** (BitLocker, FileVault, LUKS) na máquina que hospeda o banco.

---

## 5. Limitações conhecidas (por design)

- **Single-user, sem autenticação:** o app assume que só você acessa a máquina. Autenticação
  por senha está no roadmap para quem quiser expor o app na rede local.
- **Banco sem criptografia em repouso:** o SQLite é texto claro; a proteção em repouso é
  delegada à criptografia de disco do sistema operacional.
- **Confiança na Pluggy:** o modelo Open Finance exige um agregador autorizado; a Pluggy é
  participante regulada do Open Finance Brasil.

---

## 6. Como reportar uma vulnerabilidade

1. **Não abra uma issue pública** com detalhes exploráveis.
2. Abra um **Security Advisory privado** no GitHub do projeto
   (`Security` → `Report a vulnerability`) ou, se indisponível, abra uma issue pedindo um canal
   privado de contato — sem incluir detalhes técnicos da falha.
3. Inclua: versão/commit, passos para reproduzir, impacto estimado e, se possível, sugestão de
   correção.
4. Compromisso: resposta inicial em até 7 dias e crédito ao pesquisador na correção (se
   desejado).

Obrigado por ajudar a manter os dados financeiros dos usuários seguros.
