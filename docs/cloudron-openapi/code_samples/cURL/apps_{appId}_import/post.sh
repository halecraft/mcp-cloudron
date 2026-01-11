curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/import" --data '{"remotePath": "pathToApp", "backupFormat": "tar.gz", "backupConfig": {"provider": "aws53", "password":"password","encryptedFilenames": true}}'