FROM node:12.16.2

RUN mkdir -p /code
COPY . /code
WORKDIR /code

RUN yarn install --production && \
    yarn cache clean

CMD ["yarn", "start"]