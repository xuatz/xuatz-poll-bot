FROM node:7.10-alpine

RUN mkdir -p /code
COPY . /code
WORKDIR /code

RUN yarn install --production && \
    yarn cache clean

CMD ["yarn", "start"]