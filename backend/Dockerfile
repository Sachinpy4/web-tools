FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "run", "start:prod"] 