#!/bin/bash

docker compose -f docker-compose.prod.yml down
docker rmi $(docker images -a -q)
docker compose -f docker-compose.prod.yml up -d