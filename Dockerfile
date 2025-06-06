FROM node:22

RUN apt-get update && apt-get install -y openjdk-17-jre-headless

WORKDIR /app
COPY . /app

RUN npm install

EXPOSE 8888
EXPOSE 43594
EXPOSE 80

RUN npm run start

# CMD ["npm", "run", "start"]
