curl -X POST \
-H "Content-Type: application/json" \
-H "Authrization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/mail/$DOMAIN/lists/$NAME" --data '{"members": ["user@example.org", "user2@example.org"], "membersOnly": false, "active": true}'