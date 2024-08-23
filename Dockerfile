FROM node:20 

WORKDIR /app

COPY /app/dist /dist

EXPOSE 5000
CMD [ "node", "/dist/src/main" ]