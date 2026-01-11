curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/mail/$DOMAIN/relay" --data '{"provider": "mailgun", "host": "your.mailgun.host", "port": 587, "username":"mailgun_username", "password": "mailgun_password", "acceptSelfSignedCerts": true, "forceFormAddress": true}'