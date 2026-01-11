curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLOUDRON_TOKEN" "https://$CLOUDRON_DOMAIN/api/v1/apps/$APPID/configure/storage" --data '{"storageVolumeId": "your.storage.volume.id", "storageVolumePrefix": "your.storage.volume.prefix"}'