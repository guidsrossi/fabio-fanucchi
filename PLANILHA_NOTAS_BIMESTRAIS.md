# Estrutura da planilha de notas bimestrais

Use um arquivo do Google Planilhas com as abas abaixo. Os nomes dos cabeçalhos devem ser mantidos exatamente como descritos.

## Aba `Estudantes`

Uma linha por estudante.

| id_estudante | nome | turma | serie | tutor | foto_url | ativo |
| --- | --- | --- | --- | --- | --- | --- |
| 1001 | Ana Souza | 1A | 1ª série | Prof. Carlos | https://... | SIM |

- `id_estudante`: identificador único e permanente. Não reutilize o mesmo ID para alunos diferentes.
- `foto_url`: URL pública ou servida pelo Google Drive.
- `ativo`: `SIM` ou `NAO`.

## Aba `Notas`

Uma linha por estudante, ano letivo, bimestre e disciplina.

| ano | bimestre | id_estudante | disciplina | nota |
| --- | --- | --- | --- | --- |
| 2026 | 1 | 1001 | Matemática | 8,5 |
| 2026 | 1 | 1001 | Língua Portuguesa | 6,0 |
| 2026 | 2 | 1001 | Matemática | 7,5 |

- `bimestre`: número inteiro de `1` a `4`.
- `nota`: número de `0` a `10`; deixe vazio quando ainda não houver lançamento.
- A combinação `ano + bimestre + id_estudante + disciplina` deve ser única.

## Aba `Frequencias`

Uma linha por estudante, ano letivo e bimestre.

| ano | bimestre | id_estudante | frequencia |
| --- | --- | --- | --- |
| 2026 | 1 | 1001 | 92,5% |
| 2026 | 2 | 1001 | 89% |

- A combinação `ano + bimestre + id_estudante` deve ser única.
- A frequência pode ser armazenada como percentual (`92,5%`) ou número decimal (`0,925`).

## Formato esperado da API

A aplicação chama a API com `action=students&bimestre=1`, alterando o número até `4`. A resposta deve manter o formato:

```json
{
  "success": true,
  "students": [
    {
      "id": "1001",
      "nome": "Ana Souza",
      "turma": "1A",
      "serie": "1ª série",
      "tutor": "Prof. Carlos",
      "frequencia": "92,5%",
      "notas": [
        { "disciplina": "Matemática", "nota": 8.5, "bimestre": 1 },
        { "disciplina": "Língua Portuguesa", "nota": 6, "bimestre": 1 }
      ],
      "foto": { "url": "https://...", "nomeArquivo": "1001.jpg" }
    }
  ]
}
```

O Apps Script deve filtrar as abas `Notas` e `Frequencias` pelo bimestre recebido na URL antes de montar a resposta.
