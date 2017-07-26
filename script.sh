git checkout master;
git pull;
docker build -t xuatz/xuatz-poll-bot . ;
docker stop xuatz-poll-bot ;
docker rm xuatz-poll-bot ;
docker run -d --restart-always --name=xuatz-poll-bot xuatz/xuatz-poll-bot ;