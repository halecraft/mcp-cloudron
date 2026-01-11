curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/provision/activate" --data '{"username": "john_doe", "password": "securePassword123!", "email": "john.doe@example.com", "displayName": "John Doe"}'