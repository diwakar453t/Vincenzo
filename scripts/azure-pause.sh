#!/bin/bash
# Pauses Azure resources to save money

echo "Stopping PostgreSQL database (pauses compute charges for up to 7 days)..."
az postgres flexible-server stop --name preskool-db-in --resource-group preskool-rg-in

echo "Scaling App Service Plan to Free (F1) tier to stop compute charges..."
az appservice plan update --name preskool-plan-in --resource-group preskool-rg-in --sku F1

echo "Stopping App Service..."
az webapp stop --name preskool-api-backend --resource-group preskool-rg-in

echo "Done! Azure resources paused."
