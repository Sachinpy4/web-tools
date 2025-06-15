FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod +x ./node_modules/.bin/tsc
RUN npm run build
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"] 