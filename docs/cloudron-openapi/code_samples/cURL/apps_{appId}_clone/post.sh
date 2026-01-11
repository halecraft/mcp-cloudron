curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/clone" --data '{"backupId": "daily-backup", "subdomain": "clone", "domain": "smartserver.io", "ports": {}, "overwriteDns": false, "skipDnsSetup": false}'