FROM node:20-alpine

WORKDIR /app

RUN touch check.temp
RUN ls -la
COPY dist/ .

EXPOSE 5000
CMD [ "node", "./src/main" ]