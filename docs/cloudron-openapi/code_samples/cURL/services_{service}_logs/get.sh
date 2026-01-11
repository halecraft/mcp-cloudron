curl -v \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/services/$SERVICE/logs/?lines=10&format=json"