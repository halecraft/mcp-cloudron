curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/provision/restore" --data '{"backupConfig": {"provider": "aws53", "password": "strongPassword","format":"targz"}, "encryptedFilenames": true, "remotePath": "your.remote.path", "version": "v1.02.2", ipv4Config": {}, "ipv6Config": {}, "skipDnsSetup": false}'