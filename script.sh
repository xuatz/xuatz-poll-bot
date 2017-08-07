git checkout master;
git pull;
docker build -t xuatz/xuatz-poll-bot . ;
docker stop xuatz-poll-bot ;
docker rm xuatz-poll-bot ;
<<<<<<< HEAD
docker run -d --restart-always --name=xuatz-poll-bot xuatz/xuatz-poll-bot ;
=======
docker run -d --name=xuatz-poll-bot --restart=always xuatz/xuatz-poll-bot ;
>>>>>>> 2a507105ce2bfe1e8cc49e8d9e19830da736fdab
