# Antifa Move

Portal editorial responsivo para notícias, materiais em PDF, história e lambes. Notícias e documentos públicos são lidos do PostgreSQL; os envios de visitantes passam por moderação antes de aparecer no site.

## O que está pronto

- Página inicial e arquivo de notícias carregados pela API e pelo PostgreSQL.
- Página individual para cada notícia, com texto integral, imagem, categoria, data e autoria opcional.
- Biblioteca de documentos com busca, filtros dinâmicos e download de PDFs publicados.
- Formulário público para enviar notícias e PDFs sem criar uma conta.
- Fila de moderação acessada por uma chave secreta compartilhada, sem contas individuais.
- Validação de arquivos no servidor: imagens JPEG, PNG ou WebP até 5 MB; PDFs até 20 MB.
- Layout adaptado para telas móveis.
- Páginas de História e Lambes ainda usam conteúdo demonstrativo local.

## Rodar localmente

Requisitos: Node.js 22 ou superior e PostgreSQL (por exemplo, Neon).

1. Copie `.env.example` para `.env`.
2. Preencha `DATABASE_URL` com a URL do PostgreSQL.
3. Gere uma chave longa para `CHAVE_MODERACAO` com `openssl rand -hex 32`.
4. Gere outra chave, diferente, para `SESSION_SECRET` com `openssl rand -hex 32`.
5. Rode `npm install`, `npm run db:setup` e `npm run dev`.
6. Acesse `http://localhost:3000`; o envio público fica em `/publicar`.

`npm start` inicia o servidor em modo normal. `npm run db:check` testa a conexão e `npm test` executa os testes.

## Envio e moderação

1. Qualquer visitante abre `/publicar`, preenche a notícia ou seleciona um PDF e envia sem cadastro.
2. O servidor valida o tipo e o tamanho do arquivo e registra o conteúdo com status `pending`.
3. O conteúdo pendente não aparece nas páginas públicas e o arquivo fica fora da pasta pública; uploads abandonados são removidos após 24 horas quando o servidor inicia.
4. Uma pessoa da equipe acessa o link secreto `/moderar/<CHAVE_MODERACAO>`, que cria uma sessão segura e redireciona para a aba **Moderação**. O link deve ser compartilhado apenas com moderadores.
5. Ao aprovar, o conteúdo passa a aparecer no portal e o arquivo é movido para a pasta de arquivos públicos. Ao rejeitar, o arquivo pendente é removido.

Há limites básicos por endereço IP para conter abuso: cinco uploads e cinco envios por hora. Esses limites são mantidos em memória e reiniciam quando o processo reinicia; uma operação pública maior deve usar rate limiting compartilhado e, se necessário, CAPTCHA.

## Configuração de produção

- Configure `DATABASE_URL`, `CHAVE_MODERACAO` e `SESSION_SECRET` como variáveis secretas da plataforma. Não publique `.env` nem credenciais.
- A chave da rota secreta pode aparecer nos logs HTTP da hospedagem antes do redirecionamento. Restrinja o acesso aos logs, use uma chave longa e rotacione-a se houver suspeita de exposição.
- Use HTTPS; em `NODE_ENV=production`, o cookie da sessão de moderação recebe a flag `Secure`.
- Monte armazenamento persistente para `.data/uploads` e `.data/pending-uploads`. O sistema usa essas pastas no disco local; hospedagens com disco efêmero podem perder os arquivos em reinícios ou deploys. Para esse tipo de hospedagem, migre os uploads para armazenamento de objetos persistente antes de publicar o site.
- O servidor precisa estar acessível pela mesma origem das páginas, pois o frontend chama `/api/...`.
- `npm run db:setup` cria/altera o schema e carrega os exemplos sem sobrescrever registros já existentes. Os itens de demonstração são conteúdo de exemplo e devem ser revisados antes de um lançamento público.
- Configure backup do PostgreSQL e da área persistente de arquivos.

## API principal

- `GET /api/health`: estado da API e do banco.
- `GET /api/news` e `GET /api/news/:slug`: notícias publicadas.
- `GET /api/documents`: documentos publicados.
- `POST /api/uploads`: recebe arquivo para revisão, sem autenticação.
- `POST /api/submissions/news` e `POST /api/submissions/documents`: registra envios pendentes.
- `GET /api/moderation/pending`: fila protegida pela sessão de moderação.
- `POST /api/moderation/:collection/:id/approve` ou `/reject`: modera notícia ou documento.

## Estrutura

- `server.js`: servidor Express, API, moderação e arquivos enviados.
- `database.js` e `db/schema.sql`: conexão, schema e conteúdo inicial.
- `js/app.js`: interface, chamadas à API, filtros, envios e moderação.
- `js/data.js`: conteúdo demonstrativo das páginas História e Lambes e dados usados no seed inicial.
- `css/style.css`: estilos e adaptação responsiva.
