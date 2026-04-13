FROM node:20-alpine as deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production --ignore-scripts

FROM node:20-alpine
WORKDIR /app


#
EXPOSE 3000
CMD ["npm", "start"]
