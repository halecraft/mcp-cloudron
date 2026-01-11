curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/mail/$DOMAIN/enable" --data '{"name": "public", "ownerId": "uid-92c322b8-c4d7-440b-a34a-54a6428233b6", "ownerType": "user", "active": true, "enablePop3": false, "storageQuota": 0, "messagesQuota": 0}'