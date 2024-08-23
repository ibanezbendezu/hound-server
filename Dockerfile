FROM node:20 

WORKDIR /app

COPY ./dist ./dist

EXPOSE 5000
CMD [ "node", "/dist/src/main" ]