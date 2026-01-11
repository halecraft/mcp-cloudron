curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/configure/reverse_proxy" --data '{"robotsTxt": "Your robots.txt content", "csp": "Your csp content", "hstsPreload": true}'