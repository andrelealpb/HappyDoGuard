FROM node:20-alpine
WORKDIR /app
COPY webhook.js .
COPY deploy.sh /usr/local/bin/deploy.sh
RUN chmod +x /usr/local/bin/deploy.sh
EXPOSE 9000
CMD ["node", "webhook.js"]
