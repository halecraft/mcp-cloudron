curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/mail/$DOMAIN/mail_from_validation" --data '{"enabled": true}'