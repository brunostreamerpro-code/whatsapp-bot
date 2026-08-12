FROM node:20-slim

WORKDIR /app

# Instalar git (necessário para alguns pacotes npm)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./

RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
