curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/configure/cert" --data '{"domain": "app", "subdomain": "cloudron.io", "key": "CERTKEY","cert":"CERTIFICATE"}'