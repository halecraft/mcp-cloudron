curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/configure/mounts" --data '{"mounts": [{"volumeId": "vol-123abc456def", "readOnly": true}]}'