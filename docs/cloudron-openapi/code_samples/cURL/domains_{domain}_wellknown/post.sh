curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/domains/$DOMAIN/wellknown" --data '{"wellKnown": {"dnt-policy":"DO NOT TRACK"}}'