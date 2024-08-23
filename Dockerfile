FROM node:20-alpine

WORKDIR /app

RUN touch check.temp
COPY dist/ .
RUN ls -la

EXPOSE 5000
CMD [ "node", "./src/main" ]