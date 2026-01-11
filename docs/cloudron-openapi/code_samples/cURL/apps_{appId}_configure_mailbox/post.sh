curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/configure/mailbox" --data '{"enable": true, "mailboxName": "your.mailbox.name", "mailboxDomain": "your.mailbox.domain", "mailboxDisplayName": ""}'