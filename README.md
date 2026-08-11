# WhatsApp Bot - Consulta de Placas com Áudio

Bot automatizado para WhatsApp que consulta placas de veículos na API PowerCRM e responde com áudios.

## ✨ Recursos

- 🤖 Recebe mensagens com placas de veículos
- 🔍 Busca informações na API PowerCRM
- 🎙️ Envia respostas em áudio (TTS - Text-to-Speech)
- 📋 Envia detalhes em texto também
- 🔐 Autenticação segura com tokens
- 📱 Usa Baileys (emula cliente WhatsApp Web)

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Token válido do PowerCRM
- WhatsApp ativo

## 🚀 Instalação

### 1. Clonar/Criar projeto

```bash
cd c:\Users\Administrator\Desktop\whatps
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```env
POWERCRM_API_URL=https://app.powercrm.com.br
POWERCRM_BEARER_TOKEN=seu_token_aqui
POWERCRM_COMPANY_ID=1412
WHATSAPP_SESSION_NAME=whatsapp-session
AUDIO_FOLDER=./audios
```

### 3. Iniciar bot

```bash
npm start
```

Ou modo desenvolvimento (com auto-reload):

```bash
npm run dev
```

## 📱 Uso

1. **Escanear QR Code**: Na primeira execução, um QR Code será exibido no terminal
2. **Escanear com WhatsApp**: Use seu celular para escanear o QR Code
3. **Enviar placa**: Digite a placa no formato:
   - `ABC1234` (placa antiga)
   - `ABC1D23` (placa Mercosul)
   - Funciona também com hífen: `ABC-1234`

### Exemplo de conversa:

```
Cliente: Qual é o status da placa ABC1234?

Bot: [Envia áudio resumido]
    📋 INFORMAÇÕES DA PLACA
    🚗 Veículo: Honda Civic 2020
    📅 Ano: 2020
    🏷️ Placa: ABC-1234
    💼 Contrato: CT-2024-12345
    📄 Status: Ativo
```

## 🎙️ Áudios Personalizados

### Opção 1: Áudios Pré-gravados (RECOMENDADO)

Crie áudios em MP3 e coloque em: `audios/prerecorded/`

```
audios/
├── prerecorded/
│   ├── placa_encontrada.mp3
│   ├── placa_nao_encontrada.mp3
│   └── contrato_ativo.mp3
```

### Opção 2: Geração Automática (Google TTS)

O bot gera áudio automaticamente usando Google Text-to-Speech.
- ✅ Fácil de usar
- ⚠️ Limite de requisições
- 🔊 Qualidade básica

## 🔐 Segurança

**IMPORTANTE**: 

- ❌ **NUNCA** compartilhe seu token do PowerCRM
- ❌ **NUNCA** faça commit do arquivo `.env`
- ✅ Use variáveis de ambiente em produção
- ✅ Regenere tokens periodicamente

## 📁 Estrutura do Projeto

```
whatps/
├── index.js                 # Arquivo principal
├── package.json             # Dependências
├── .env                      # Variáveis de ambiente (não fazer commit)
├── .env.example              # Exemplo de configuração
├── services/
│   ├── powercrm.js          # Integração API PowerCRM
│   └── audio.js             # Geração e envio de áudios
├── utils/
│   └── parser.js            # Parser de placas
├── audios/                   # Áudios gerados e pré-gravados
│   ├── prerecorded/         # Áudios pré-gravados
│   └── (áudios gerados)
└── auth_info_baileys/       # Sessão WhatsApp (não fazer commit)
```

## 🛠️ Troubleshooting

### QR Code não aparece

```bash
# Verifique se o terminal suporta caracteres especiais
npm start
```

### Erro: Token inválido

```bash
# Regenere o token no PowerCRM e atualize .env
POWERCRM_BEARER_TOKEN=novo_token
```

### Áudio não está sendo enviado

```bash
# Verifique a pasta audios/ existe
mkdir -p audios/prerecorded

# Tente usar TTS automático
npm install google-tts-api
```

### Placa não é reconhecida

```bash
# Teste o parser
node -e "import('./utils/parser.js').then(m => console.log(m.extractPlateNumber('ABC1234')))"
```

## 🔌 Endpoints PowerCRM Usados

- `GET /company/pltVrfyQttn?plates=ABC1234` - Buscar placa
- `GET /cmby?cb=18&cy=2022` - Combis e dados adicionais

## 📞 Suporte

Para dúvidas sobre a API PowerCRM, consulte a documentação oficial.

## 📝 Melhorias Futuras

- [ ] Banco de dados para cache de consultas
- [ ] Fila de processamento para múltiplas requisições
- [ ] Painel admin para gerenciar respostas
- [ ] Integração com mais APIs de dados
- [ ] Suporte a imagens e documentos

---

**Desenvolvido com ❤️ para automação WhatsApp**
