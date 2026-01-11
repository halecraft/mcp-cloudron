curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/configure/operators" --data '{"operators": {"users": ['uid-3213das...'], "groups": ['gid-3213dsa...']}}'