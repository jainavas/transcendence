FROM node:18

# Configurar zona horaria
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY app ./app
CMD ["npm", "start"]
