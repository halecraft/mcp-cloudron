curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/exec" --data '{"cmd": ['/bin/bash'], "tty": true, "lang": "en_US.UTF-8"}'