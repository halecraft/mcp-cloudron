curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/provision/setup" --data '{"domainConfig": {"provider": "aws53", "domain": "","zoneName":"", "config":{}, "tlsConfig":{}} "ipv4Config": {}, "ipv6Config": {}}'