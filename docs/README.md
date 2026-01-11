# Cloudron API

The cloudron-openapi/ directory includes the full openapi documentation split into directories and files for easier reference.

For example, here are the `cloudron-openapi/paths`:

```
app_passwords_{passwordId}.json                         mail_{domain}_lists.json
app_passwords.json                                      mail_{domain}_mail_from_validation.json
applinks_{id}_icon.json                                 mail_{domain}_mailbox_count.json
applinks_{id}.json                                      mail_{domain}_mailboxes_{name}_aliases.json
applinks.json                                           mail_{domain}_mailboxes_{name}.json
apps_{appId}_backups_{backupId}_download.json           mail_{domain}_mailboxes.json
apps_{appId}_backups_{backupId}.json                    mail_{domain}_relay.json
apps_{appId}_backups.json                               mail_{domain}_send_test_mail.json
apps_{appId}_check_for_updates.json                     mail_{domain}_status.json
apps_{appId}_clone.json                                 mail_{domain}.json
apps_{appId}_configure_access_restriction.json          mailserver_clear_eventlog.json
apps_{appId}_configure_automatic_backup.json            mailserver_dnsbl_config.json
apps_{appId}_configure_automatic_update.json            mailserver_eventlog.json
apps_{appId}_configure_cert.json                        mailserver_location.json
apps_{appId}_configure_cpu_quota.json                   mailserver_mailbox_sharing.json
apps_{appId}_configure_crontab.json                     mailserver_max_email_size.json
apps_{appId}_configure_debug_mode.json                  mailserver_solr_config.json
apps_{appId}_configure_env.json                         mailserver_spam_acl.json
apps_{appId}_configure_icon.json                        mailserver_spam_custom_config.json
apps_{appId}_configure_inbox.json                       mailserver_usage.json
apps_{appId}_configure_label.json                       mailserver_virtual_all_mail.json
apps_{appId}_configure_location.json                    network_blocklist.json
apps_{appId}_configure_mailbox.json                     network_dynamic_dns'.json
apps_{appId}_configure_memory_limit.json                network_ipv4_config.json
apps_{appId}_configure_mounts.json                      network_ipv4.json
apps_{appId}_configure_notes.json                       network_ipv6_config.json
apps_{appId}_configure_operators.json                   network_ipv6.json
apps_{appId}_configure_redis.json                       notifications_{notificationId}.json
apps_{appId}_configure_reverse_proxy.json               notifications.json
apps_{appId}_configure_storage.json                     oidc_clients_{clientId}.json
apps_{appId}_configure_tags.json                        oidc_clients.json
apps_{appId}_configure_turn.json                        oidc_sessions.json
apps_{appId}_configure_upstream_uri.json                profile_avatar_{userId}.json
apps_{appId}_eventlog.json                              profile_avatar.json
apps_{appId}_exec.json                                  profile_background_image.json
apps_{appId}_export.json                                profile_password.json
apps_{appId}_icon.json                                  profile_twofactorauthentication_disable.json
apps_{appId}_import.json                                profile_twofactorauthentication_enable.json
apps_{appId}_logs.json                                  profile_twofactorauthentication_secret.json
apps_{appId}_logstream.json                             profile.json
apps_{appId}_repair.json                                provision_activate.json
apps_{appId}_restart.json                               provision_restore.json
apps_{appId}_restore.json                               provision_setup.json
apps_{appId}_start.json                                 reverseproxy_renew_certs.json
apps_{appId}_stop.json                                  reverseproxy_trusted_ips.json
apps_{appId}_task.json                                  services_{service}_graphs.json
apps_{appId}_uninstall.json                             services_{service}_logs.json
apps_{appId}_update.json                                services_{service}_logstream.json
apps_{appId}.json                                       services_{service}_rebuild.json
apps.json                                               services_{service}_restart.json
backups_{backupId}.json                                 services_{service}.json
backups_cleanup.json                                    services_platform_status.json
backups_config_storage.json                             services.json
backups_config.json                                     system_block_devices.json
backups_create.json                                     system_cpus.json
backups_mount_status.json                               system_disk_usage.json
backups_policy.json                                     system_info.json
backups_remount.json                                    system_logs_{unit}.json
backups.json                                            system_logstream_{unit}.json
branding_cloudron_avatar.json                           system_memory.json
branding_cloudron_background.json                       system_reboot.json
branding_cloudron_name.json                             tasks_{taskId}_logs.json
branding_footer.json                                    tasks_{taskId}_logstream.json
cloudron_avatar.json                                    tasks_{taskId}_stop.json
cloudron_background.json                                tasks_{taskId}.json
cloudron_language.json                                  tasks.json
cloudron_languages.json                                 tokens_{tokenId}.json
cloudron_status.json                                    tokens.json
cloudron_time_zone.json                                 updater_autoupdate_pattern.json
dashboard_config.json                                   updater_check_for_updates.json
dashboard_location.json                                 updater_update.json
dashboard_startPrepareLocation.json                     updater_updates.json
directory_server_config.json                            user_directory.json
docker_registry_config.json                             users_{userId}_active.json
domains_{domain}_config.json                            users_{userId}_ghost.json
domains_{domain}_dns_check.json                         users_{userId}_groups.json
domains_{domain}_wellknown.json                         users_{userId}_invite_link.json
domains_{domain}.json                                   users_{userId}_password_reset_link.json
domains_sync_dns.json                                   users_{userId}_password.json
domains.json                                            users_{userId}_profile.json
eventlog_{eventId}.json                                 users_{userId}_role.json
eventlog.json                                           users_{userId}_send_invite_email.json
external_ldap_config.json                               users_{userId}_send_password_reset_email.json
external_ldap_sync.json                                 users_{userId}_twofactorauthentication_disable.json
groups_{groupId}_members.json                           users_{userId}.json
groups_{groupId}_name.json                              users.json
groups_{groupId}.json                                   volumes_{id}_files_{filename}.json
groups.json                                             volumes_{id}_remount.json
mail_{domain}_banner.json                               volumes_{id}_status.json
mail_{domain}_catch_all.json                            volumes_{id}.json
mail_{domain}_enable.json                               volumes.json
mail_{domain}_lists_{name}.json
```

