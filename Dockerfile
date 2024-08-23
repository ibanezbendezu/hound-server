FROM node:20

COPY ./dist ./dist

EXPOSE 5000
CMD [ "node", "/dist/src/main" ]