curl -X PUT \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/mail/$DOMAIN/mailboxes/$NAME/aliases" --data '{"aliases" : [{"name": "public", "domain": "your.mail.domain.com"}]}'