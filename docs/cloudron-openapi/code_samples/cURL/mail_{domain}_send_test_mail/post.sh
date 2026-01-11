curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/mail/$DOMAIN/send_test_mail" --data '{"to": "testmail.reciever@example.org"}'