# Deploy no Render 🚀

## Pré-requisitos

1. **Conta GitHub** - Seu repositório deve estar no GitHub
2. **Conta Render** - https://render.com
3. **Token PowerCRM** - Token válido da API PowerCRM

## Passo a Passo

### 1. Preparar o repositório

```bash
# Inicializar Git (se não tiver)
git init
git add .
git commit -m "Initial commit: WhatsApp bot com PowerCRM e FIPE"

# Criar repositório no GitHub
# https://github.com/new
# Nomear como: whatsapp-bot

# Push para GitHub
git remote add origin https://github.com/SEU_USER/whatsapp-bot.git
git branch -M main
git push -u origin main
```

### 2. Criar projeto no Render

1. Acesse https://render.com
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: whatsapp-bot
   - **Root Directory**: deixe em branco
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Adicionar variáveis de ambiente

No Render, vá em "Environment" e adicione:

```
POWERCRM_API_URL=https://app.powercrm.com.br
POWERCRM_BEARER_TOKEN=seu_token_aqui
POWERCRM_COMPANY_ID=1412
WHATSAPP_SESSION_NAME=whatsapp-session
AUDIO_FOLDER=./audios
```

### 4. Criar Redis no Render (opcional)

1. Clique em "New +" → "Redis"
2. Configure:
   - **Name**: whatsapp-redis
   - **Plan**: Free
3. Copie a **Internal Redis URL**
4. Adicione no bot:
   ```
   REDIS_URL=redis://seu-url-aqui:6379
   ```

### 5. Deploy automático

- Todo push para `main` fará deploy automático
- Logs aparecem em tempo real

## URLs após deploy

- **Bot**: https://seu-projeto.onrender.com
- **QR Code**: https://seu-projeto.onrender.com:3000

## Troubleshooting

**Bot não conecta ao WhatsApp:**
- Verificar logs no Render
- Pode ser sessão expirada
- Gerar novo QR Code

**Redis não conecta:**
- Verificar URL do Redis
- Usar Redis Cloud como alternativa: https://redis.com

**Erros de build:**
- Verificar `npm start` localmente
- Verificar Node version no package.json

## Monitoramento

- Ver logs: Dashboard do Render
- Alertas automáticos de erro
- Uptime monitoring

---

**Pronto para deploy!** 🚀
