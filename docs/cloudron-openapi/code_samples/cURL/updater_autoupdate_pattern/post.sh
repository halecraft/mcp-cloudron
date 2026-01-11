curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/updater/autoupdate_pattern" --data '{"pattern":"00 00 1,5 * * *"}'