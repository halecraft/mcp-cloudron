curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/services/$SERVICE" -- data '{"memoryLimit":4294967296, "recoveryMode": false}'