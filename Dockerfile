FROM node:7.10-alpine

RUN mkdir -p /code
COPY . /code
WORKDIR /code

RUN yarn install --production && \
    yarn cache clean

CMD ["yarn", "start"]

# docker build -t xuatz/xuatz-poll-bot .
# docker run -d --name=xuatz-poll-bot -e BOT_TOKEN='369512628:AAFPVU1RFtdrN0vVw3jf3t6hGVa-_JfV13E' xuatz/xuatz-poll-bot