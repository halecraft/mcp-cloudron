curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/mailserver/spam_custom_config" --data '{"config":"header TO_ADDRESS_TO_BLOCK To =~ /^(mail@your.domain\\.io|mail@your.domain\\.org)$/i score TO_ADDRESS_TO_BLOCK 10.0 describe TO_ADDRESS_TO_BLOCK Emails sent to blocked addresses are likely spam."}'