curl \
-H "Accept: text/event-stream" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/services/$SERVICE/logstream?lines=100"