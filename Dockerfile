FROM node:20 

WORKDIR /

COPY /dist /dist

EXPOSE 5000
CMD [ "node", "/dist/src/main" ]