git checkout master;
git pull;
docker build -t xuatz/xuatz-poll-bot . ;
docker stop xuatz-poll-bot ;
docker rm xuatz-poll-bot ;
docker run -d --name=xuatz-poll-bot --restart=always xuatz/xuatz-poll-bot ;
