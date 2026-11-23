# User e Payment Service

Trabalho 4 GYM. Serviços de Rodrigo Adelino em JavaScript, Node.js 22, Express e MySQL. Cada serviço tem seu banco e seu usuário de banco. O Payment consulta o User por HTTP antes de gravar um pagamento simulado.

## Rodar a demonstração

Na raiz do monorepo, execute:

```sh
docker compose -f node-services/compose.yaml up --build
```

Em outro terminal, execute:

```sh
cd frontend
npm ci
npm run dev
```

Abra http://localhost:5173 e selecione **Pagamentos**. Cadastre um usuário fictício, registre um valor e consulte o pagamento pelo ID. O painel Comunicação mostra o `GET /users/{id}` feito pelo Payment. A integração usa as portas 8003 (User) e 8004 (Payment). Os serviços Python podem ser iniciados separadamente pelo Compose da equipe.

## Rotas

| Serviço | Rota | Finalidade |
| --- | --- | --- |
| User | `POST /users` | Cadastra nome e e-mail. Retorna `201` ou `409` para e-mail repetido. |
| User | `GET /users/{id}` | Retorna ID e nome. O Payment usa a rota para verificar se o usuário existe. |
| Payment | `POST /payments` | Registra a simulação após consultar User. Recebe `user_id` e `amount_cents` (inteiros). |
| Payment | `GET /payments/{id}` | Consulta valor, usuário e status da simulação. |
| Ambos | `GET /health` | Verifica se o serviço consegue acessar seu próprio banco. |

Em `POST /payments`, envie um UUID v4 no cabeçalho `Idempotency-Key`. Repetir a mesma chave com os mesmos dados retorna o registro original (`200`). Reutilizá-la com dados diferentes retorna `409`. Usuário inexistente retorna `404`. Se o User estiver indisponível, Payment retorna `503` sem criar o registro. O registro é simulado. Use somente dados fictícios na demonstração.

## Implantar com Railway e Vercel

1. Crie os bancos `user_db` e `payment_db` no MySQL. Use credenciais próprias para cada banco e conceda `SELECT`, `INSERT` e `CREATE` no banco correspondente. O `init.sql` demonstra a configuração local.
2. Crie dois serviços do Railway a partir da branch com esta implementação. Em cada serviço, defina `/node-services` como diretório raiz. Use `node user-service/index.js` como comando de início para User e `node payment-service/index.js` para Payment.
3. Configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`; use `DB_SSL=true` se o provedor exigir TLS. Defina `USER_SERVICE_URL` no Payment com a URL HTTP interna do User e a porta em que ele escuta. Use `/health` como verificação de prontidão.
4. No Vercel, mantenha `frontend` como diretório raiz e configure `USER_URL` e `PAYMENT_URL` com os endereços HTTPS dos serviços. Publique a branch. O gateway encaminha `/api/user/*` e `/api/payment/*` às respectivas APIs.
5. Abra a aplicação publicada, teste as duas rotas `/api/user/health` e `/api/payment/health` e repita a demonstração pela aba **Pagamentos**.
