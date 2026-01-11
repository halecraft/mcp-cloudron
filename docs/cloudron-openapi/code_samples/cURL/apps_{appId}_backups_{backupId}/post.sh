curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/backups/$BACKUPID" --data '{"label": "daily-backup", "preserveSecs": 8600}'