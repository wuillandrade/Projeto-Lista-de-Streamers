# Xeque.live

Diretório de streamers de xadrez ao vivo, com dados fornecidos pela API pública do Chess.com.

## Executar localmente

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev`: inicia o servidor de desenvolvimento.
- `npm run build`: verifica os tipos e gera a versão de produção em `dist`.
- `npm run preview`: serve localmente a versão de produção.
- `npm run lint`: executa o ESLint.

## Funcionalidades

- Lista streamers ao vivo e prioriza o link da plataforma que está transmitindo.
- Busca por nome, estados vazios e retorno de erro com opção para tentar novamente.
- Atualização manual dos dados e layout responsivo.
