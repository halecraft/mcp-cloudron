curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/update" --data '{"appStoreId":"io.n8n.cloudronapp@3.87.0", "skipBackup": true, "force": false}'