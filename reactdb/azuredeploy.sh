#!/bin/bash

# Variables
RESOURCE_GROUP="gnanadevrg"
APP_SERVICE_PLAN="ASP-gnanadevrg-accc"
WEBAPP_NAME="my-react-express-app"

# 1. Create Web App (using existing plan)
az webapp create --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN --name $WEBAPP_NAME \
  --runtime "NODE|18-lts"
  --src-path ./frontend/dist

# 2. Deploy code (from current directory)
az webapp up --name $WEBAPP_NAME --runtime "NODE|18-lts"