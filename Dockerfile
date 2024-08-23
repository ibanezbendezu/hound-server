FROM node:20

WORKDIR /app

RUN ls -la
COPY dist/ .

EXPOSE 5000
CMD [ "node", "./src/main" ]