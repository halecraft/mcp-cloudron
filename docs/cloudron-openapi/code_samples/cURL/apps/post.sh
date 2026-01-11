curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps" --data '{"appStoreId":"io.cloudron.surfer","domain":"example.com",subdomain":"newapp","accessRestriction":null}'