FROM node:22.14.0-alpine

WORKDIR /app

COPY package*.json .

ARG NODE_ENV

RUN if [ "$NODE_ENV" = "development" ]; \
    then npm install ci; \
    else npm install --only=production; \
    fi

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
