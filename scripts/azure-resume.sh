#!/bin/bash
# Resumes Azure resources from a paused state

echo "Starting PostgreSQL database..."
az postgres flexible-server start --name preskool-db-in --resource-group preskool-rg-in

echo "Scaling App Service Plan back to Basic (B1) tier..."
az appservice plan update --name preskool-plan-in --resource-group preskool-rg-in --sku B1

echo "Starting App Service..."
az webapp start --name preskool-api-backend --resource-group preskool-rg-in

echo "Done! Azure resources resumed."
