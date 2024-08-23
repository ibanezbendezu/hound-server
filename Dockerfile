FROM node:20

COPY ./dist ./app

EXPOSE 5000
CMD [ "node", "/dist/src/main" ]