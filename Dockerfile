FROM node:20

RUN ls -la
COPY ./dist/ ./dist/

EXPOSE 5000
CMD [ "node", "/dist/src/main" ]