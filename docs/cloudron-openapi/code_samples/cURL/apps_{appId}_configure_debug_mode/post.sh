curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/configure/debug_mode" --data '{"debugMode":{"readonlyRootfs":false,"cmd":["/bin/bash","-c","echo \"Repair mode. Use the webterminal or cloudron exec to repair. Sleeping\" && sleep infinity"]}'