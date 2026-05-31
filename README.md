# Plataforma de Tutoria Escolar com Google Planilhas

Projeto em Next.js para Vercel usando Google Planilhas como banco de dados.

## Modulos

- Dashboard principal: lista os modulos disponiveis conforme o perfil logado.
- Apoio ao estudante: mantem os registros, validacoes e historico da funcionalidade original.
- Registro de tutorias mensais: permite que professores lancem a quantidade mensal de tutorias por estudante.
- Relatorios e graficos: dashboard da gestao com totais, medias, rankings, filtros e graficos de acompanhamento.
- Gestao escolar: cadastros, vinculos professor/estudante e perguntas pre-definidas.

## Perfis

- Gestao: visualiza todos os apoios, administra cadastros e acompanha relatorios consolidados de tutorias.
- Professor: registra apoio presencial e registra as tutorias mensais dos estudantes vinculados.
- Estudante: valida apoio recebido.

## Como rodar

```bash
npm install
npm run dev
```

Acesse:

```txt
http://localhost:3000
```

## Como conectar com Google Planilhas

### 1. Crie uma planilha no Google Sheets

Crie estas abas exatamente com estes nomes:

```txt
usuarios
estudantes
professor_estudantes
apoios
perguntas
respostas
tutorias_mensais
```

### 2. Cabecalhos das abas

#### usuarios

```txt
id | nome | email | senha | perfil | turma | precisa_trocar_senha
```

Perfis aceitos:

```txt
gestao
professor
estudante
```

Valores aceitos em `precisa_trocar_senha`:

```txt
sim
nao
```

Use `sim` quando o usuario precisa trocar a senha no proximo acesso. Use `nao` quando ele pode entrar normalmente.

Exemplo:

```txt
1 | Gestao Escolar | gestao@escola.com | 123456 | gestao | | nao
2 | Prof. Joao | professor@escola.com | 123456 | professor | | sim
3 | Maria Silva | estudante@escola.com | 123456 | estudante | 2A | nao
```

Quando a gestao cadastra um professor pelo sistema, ele entra automaticamente na aba `usuarios` assim:

```txt
novo_id | Nome do Professor | email@escola.com | 123456 | professor | | sim
```

Professor nao tem turma fixa na aba `usuarios`. O vinculo com estudantes atendidos fica na aba `professor_estudantes`.

No primeiro login, o professor usa a senha `123456` e o sistema mostra a tela de troca obrigatoria de senha. Depois que ele troca, a coluna `precisa_trocar_senha` muda para `nao`.

#### estudantes

```txt
id | nome | email | turma
```

Exemplo:

```txt
3 | Maria Silva | estudante@escola.com | 2A
```

#### professor_estudantes

```txt
id | professor_id | estudante_id | ativo
```

Exemplo:

```txt
1 | 2 | 3 | sim
2 | 2 | 8 | sim
3 | 4 | 5 | nao
```

Essa aba guarda quais estudantes cada professor pode atender. A gestao altera esses vinculos pelo checklist no sistema. Se um estudante ja estiver vinculado a um professor com `ativo` igual a `sim`, ele nao aparece no checklist dos outros professores. O professor so consegue listar e registrar apoio para estudantes vinculados a ele.

#### perguntas

```txt
id | pergunta | tipo | ativa
```

Exemplo:

```txt
1 | O estudante participou do apoio? | sim_nao | sim
2 | Qual foi a principal dificuldade observada? | texto | sim
3 | O estudante precisa de novo apoio? | sim_nao | sim
```

A gestao pode cadastrar, editar, desativar e reativar essas perguntas pelo sistema. Perguntas com `ativa` igual a `nao` nao aparecem para novos registros de apoio, mas continuam preservadas nos apoios antigos.

#### apoios

```txt
id | estudante_id | professor_id | turma | disciplina | data | feedback | status_validacao | observacao_estudante
```

#### respostas

```txt
id | apoio_id | pergunta_id | resposta
```

#### tutorias_mensais

```txt
id | mes | estudante_id | professor_id | turma | quantidade | observacao | atualizado_em
```

Exemplo:

```txt
1 | 2026-05 | 3 | 2 | 2A | 4 | Recuperacao de atividades | 2026-05-31T12:00:00.000Z
```

Essa aba guarda o consolidado mensal informado pelo professor para cada estudante vinculado. O campo `mes` usa o formato `AAAA-MM`. Quando o professor salva novamente o mesmo estudante no mesmo mes, o registro e atualizado.

O sistema cria a aba `tutorias_mensais` e seus cabecalhos automaticamente se a Service Account tiver permissao de editor na planilha.

## Rotas principais

### Interface

```txt
/                 Login
/dashboard        Dashboard principal com modulos por perfil
```

### APIs

```txt
POST /api/login
POST /api/logout
GET  /api/me
GET  /api/apoios
POST /api/apoios
POST /api/validar-apoio
GET  /api/estudantes
POST /api/estudantes
GET  /api/professores
POST /api/professores
PUT  /api/professores
GET  /api/perguntas
POST /api/perguntas
PUT  /api/perguntas
DELETE /api/perguntas
GET  /api/tutorias-mensais
POST /api/tutorias-mensais
PUT  /api/tutorias-mensais
```

`GET /api/tutorias-mensais` muda o retorno conforme o perfil:

- Professor: retorna os estudantes vinculados e as quantidades do mes selecionado.
- Gestao: retorna relatorio consolidado com filtros, indicadores, rankings e dados para graficos.

Filtros aceitos para gestao:

```txt
mes=2026-05
turma=2A
professor_id=2
estudante_id=3
```

### 3. Crie uma Service Account

No Google Cloud Console:

1. Crie um projeto.
2. Ative a API Google Sheets.
3. Va em IAM e Admin > Service Accounts.
4. Crie uma Service Account.
5. Gere uma chave JSON.
6. Copie o `client_email` e o `private_key`.

### 4. Compartilhe a planilha

Compartilhe sua Google Planilha com o e-mail da Service Account.

Exemplo:

```txt
sistema-tutoria@seu-projeto.iam.gserviceaccount.com
```

De permissao de Editor, porque o sistema precisa gravar novos professores e atualizar senhas.

### 5. Configure o .env.local

Crie um arquivo `.env.local` na raiz:

```txt
GOOGLE_SHEET_ID=ID_DA_PLANILHA
GOOGLE_CLIENT_EMAIL=EMAIL_DA_SERVICE_ACCOUNT
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE\n-----END PRIVATE KEY-----\n"
JWT_SECRET=uma_chave_secreta_forte
```

O ID da planilha fica na URL:

```txt
https://docs.google.com/spreadsheets/d/ID_DA_PLANILHA/edit
```

### 6. Subir na Vercel

1. Envie o projeto para o GitHub.
2. Importe o repositorio na Vercel.
3. Em Settings > Environment Variables, adicione:

```txt
GOOGLE_SHEET_ID
GOOGLE_CLIENT_EMAIL
GOOGLE_PRIVATE_KEY
JWT_SECRET
```

4. Clique em Deploy.

## Logins de teste

Depois de preencher a aba `usuarios`, use:

```txt
gestao@escola.com / 123456
professor@escola.com / 123456
estudante@escola.com / 123456
```

Se o professor estiver com `precisa_trocar_senha` igual a `sim`, o primeiro acesso vai pedir uma nova senha.
