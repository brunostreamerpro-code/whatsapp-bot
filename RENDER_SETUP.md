# Setup Render - WhatsApp Bot

## ⚡ Deploy Rápido (5 min)

### 1. Preparar GitHub

```bash
# Terminal local
cd /caminho/do/whatps

# Inicializar Git
git init
git add .
git commit -m "WhatsApp bot inicial"

# Criar repo no GitHub
# https://github.com/new → whatsapp-bot

# Conectar e fazer push
git remote add origin https://github.com/SEU_USER/whatsapp-bot.git
git branch -M main
git push -u origin main
```

### 2. Deploy no Render

1. Ir para https://render.com
2. Fazer login com GitHub
3. Clicar "New +" → "Web Service"
4. Selecionar seu repositório `whatsapp-bot`
5. Configurar:
   - **Name**: whatsapp-bot
   - **Environment**: Node
   - **Build**: `npm install`
   - **Start**: `npm start`
   - **Plan**: Free (ou pago para uptime 24/7)

### 3. Variáveis de Ambiente

No Render → Environment vars, adicionar:

```
POWERCRM_API_URL = https://app.powercrm.com.br
POWERCRM_BEARER_TOKEN = seu_token_do_powercrm
POWERCRM_COMPANY_ID = 1412
```

### 4. Deploy!

- Clique "Deploy"
- Esperar 2-3 min
- Verificar logs em tempo real

## 📱 Acessar o Bot

Após deploy:

```
QR Code: https://seu-projeto.onrender.com:3000
Logs: https://render.com/dashboard
```

## ⚠️ Pontos Importantes

### Sessão WhatsApp
- Primeira vez: escanear QR Code
- Depois: mantém a sessão
- Se desconectar: gerar novo QR

### Redis (Cache)
- Sem Redis = dados em memória
- Com Redis = dados persistem
- Usar Redis Cloud grátis: https://redis.com

### Uptime
- **Plan Free**: ~30 min inatividade = pausa
- **Plan Paid**: 24/7 online

## 🔧 Troubleshooting

**Bot parou?**
- Verificar logs no Render
- Clicar "Redeploy" manualmente

**QR Code não abre?**
- Verificar URL: `seu-projeto.onrender.com:3000`
- Checar logs de erro

**Sessão WhatsApp expirou?**
- Gerar novo QR Code
- Escanear novamente

## 💾 Dados

Por default, dados são salvos em RAM (temporários).

Para dados persistentes:
1. Adicionar Redis Cloud
2. Conectar banco de dados

## 📊 Monitoramento

- Logs aparecem em tempo real
- Alertas automáticos de erro
- Métricas de CPU/RAM

---

**Pronto? Bora fazer deploy!** 🚀
