Addons
Overview

Addons are services like database, authentication, email, caching that are part of the Cloudron runtime. Setup, provisioning, scaling and maintenance of addons is taken care of by the platform.

The fundamental idea behind addons is to allow sharing of services across applications. For example, a single MySQL server instance can be used across multiple apps. The Cloudron platform sets up addons in such a way that apps are isolated from each other.
Using Addons

Addons are opt-in and must be specified in the Cloudron Manifest. When the app runs, environment variables contain the necessary information to access the addon. For example, the mysql addon sets the CLOUDRON_MYSQL_URL environment variable which is the connection string that can be used to connect to the database.

When working with addons, developers need to remember the following:

    Environment variables are subject to change every time the app restarts. This can happen if the Cloudron is rebooted or restored or the app crashes or an addon is re-provisioned. For this reason, applications must not cache the value of environment variables across restarts. Instead, they must use the environments directly. For example, use process.env.CLOUDRON_MYSQL_URL (nodejs) or getenv("CLOUDRON_MYSQL_URL") (PHP).

    Addons must be setup or updated on each application start up. Most applications use DB migration frameworks for this purpose to setup and update the DB schema.

    Addons are configured in the addons section of the manifest as below:

    {
      ...
      "addons": {
        "ldap": { },
        "redis" : { }
      }
    }

Addons
docker

This addon allows an app to create containers on behalf of the user. Note that this addons does not provide full fledged access to docker for security purposes. Only a limited set of operations are permitted.

Exported environment variables:

CLOUDRON_DOCKER_HOST=        # tcp://<IP>:<port>

Some important restrictions:

    Only the app can access the docker API. Containers created by the app cannot use the docker API.

    Any created containers is automatically moved to the cloudron internal network

    Any bind mounts have to be under /app/data.

    Containers created by an application are tracked by Cloudron internally and will get removed when the app is uninstalled.

    Finally, only a Cloudron superadmin can install/update/exec apps with the docker addon for security reasons.

email

This addon allows an app to send and recieve emails on behalf of the user. The intended use case is webmail applications.

If an app wants to send mail (e.g notifications), it must use the sendmail addon. If the app wants to receive email (e.g user replying to notification), it must use the recvmail addon instead.

Apps using the IMAP and ManageSieve services below must be prepared to accept self-signed certificates (this is not a problem because these are addresses internal to the Cloudron).

Exported environment variables:

CLOUDRON_EMAIL_SMTP_SERVER=       # SMTP server IP or hostname. This is the internal name of the mail server.
CLOUDRON_EMAIL_SMTP_PORT=         # SMTP server port. STARTL TLS is disabled on this port.
CLOUDRON_EMAIL_SMTPS_PORT=        # SMTPS server port
CLOUDRON_EMAIL_STARTTLS_PORT=     # SMTP STARTTLS port
CLOUDRON_EMAIL_IMAP_SERVER=       # IMAP server IP or hostname.
CLOUDRON_EMAIL_IMAP_PORT=         # IMAP server port
CLOUDRON_EMAIL_IMAPS_PORT=        # IMAPS server port. TLS required.
CLOUDRON_EMAIL_SIEVE_SERVER=      # ManageSieve server IP or hostname.
CLOUDRON_EMAIL_SIEVE_PORT=        # ManageSieve server port. TLS required.
CLOUDRON_EMAIL_DOMAIN=            # Primary mail domain of the app
CLOUDRON_EMAIL_DOMAINS=           # Comma separate list of domains handled by the server
CLOUDRON_EMAIL_SERVER_HOST=       # The FQDN of the mail server. Only use this, if the app cannot connect using the internal name.

ldap

This addon provides LDAP based authentication via LDAP version 3.

Exported environment variables:

CLOUDRON_LDAP_SERVER=                                # ldap server IP
CLOUDRON_LDAP_HOST=                                  # ldap server IP (same as above)
CLOUDRON_LDAP_PORT=                                  # ldap server port
CLOUDRON_LDAP_URL=                                   # ldap url of the form ldap://ip:port
CLOUDRON_LDAP_USERS_BASE_DN=                         # ldap users base dn of the form ou=users,dc=cloudron
CLOUDRON_LDAP_GROUPS_BASE_DN=                        # ldap groups base dn of the form ou=groups,dc=cloudron
CLOUDRON_LDAP_BIND_DN=                               # DN to perform LDAP requests
CLOUDRON_LDAP_BIND_PASSWORD=                         # Password to perform LDAP requests

The suggested LDAP filter is (&(objectclass=user)(|(username=%uid)(mail=%uid))). This allows the user to login via username or email.

For debugging, cloudron exec can be used to run the ldapsearch client within the context of the app:

cloudron exec

# list users
> ldapsearch -x -H "${CLOUDRON_LDAP_URL}" -D "${CLOUDRON_LDAP_BIND_DN}" -w "${CLOUDRON_LDAP_BIND_PASSWORD}" -b "${CLOUDRON_LDAP_USERS_BASE_DN}"

# list users with authentication (Substitute username and password below)
> ldapsearch -x -H "${CLOUDRON_LDAP_URL}" -D cn=<username>,${CLOUDRON_LDAP_USERS_BASE_DN} -w <password> -b  "${CLOUDRON_LDAP_USERS_BASE_DN}"

# list groups
> ldapsearch -x -H "${CLOUDRON_LDAP_URL}" -D "${CLOUDRON_LDAP_BIND_DN}" -w "${CLOUDRON_LDAP_BIND_PASSWORD}" -b "${CLOUDRON_LDAP_GROUPS_BASE_DN}"

The user listing has the following LDAP attributes:

    objectclass - array that contains user
    objectcategory - set to 'person',
    uid, entryuuid - Unique identifier
    cn - Unique identifier (same as uid)
    mail - User's primary email
    displayName - Full name of the user
    mailAlternateAddress - Alternate/Fallback email address of the user (for password reset)
    givenName - First name of the user
    sn - Last name of the user
    username - Username set during account creation
    samaccountname - Same as username
    memberof - List of Cloudron groups the user is a memer of

The groups listing has the following LDAP attributes:

    objectclass - array that contains group
    cn: name of the group
    gidnumber: Unique identifier
    memberuid: array of members. Each entry here maps to uid in the user listing.

Unlike other addons, the LDAP addon get some special treatment and cannot be enabled on already installed apps. This means that you cannot push an update that enables LDAP addon and expect already installed apps to gain LDAP functionality. The user has to install the app afresh for LDAP integration.

The reason for this is that Cloudron keeps track of whether an app was installed with or without Cloudron user management using a "sso" flag. This flag cannot be changed after installation for simplicity. If it were dynamically changeable, it is unclear what's supposed to happen if an app was installed with sso and then later the user removed ldap addon i.e what happens to existing users? In some apps, an admin user might need to be created explicitly because they don't support LDAP and local database authentication simultaneously.
localstorage

Since all Cloudron apps run within a read-only filesystem, this addon provides a writeable folder under /app/data/. All contents in that folder are included in the backup. On first run, this folder will be empty. File added in this path as part of the app's image (Dockerfile) won't be present. A common pattern is to create the directory structure required the app as part of the app's startup script.

The permissions and ownership of data within that directory are not guranteed to be preserved. For this reason, each app has to restore permissions as required by the app as part of the app's startup script.

If the app is running under the recommeneded cloudron user, this can be achieved with:

chown -R cloudron:cloudron /app/data

FTP

FTP access can be enabled using the ftp option. The uid and uname refer to the user under which the ftp files will be stored in the app's local storage. FTP access should be enabled wisely since many apps don't like data being changed behind their back.

    "localstorage": {
      "ftp": {
        "uid": 33,
        "uname": "www-data"
      }
    }

sqlite

Sqlite database files can be specified using the sqlite option.

Sqlite files that are actively in use cannot be backed up using a simple cp. Cloudron will take a consistent portable backups of Sqlite files specified in this option.

    "localstorage": {
      "sqlite": {
        "paths": ["/app/data/db/users.db"]
      }
    }

Database files must exist. If they are missing, backup and restore operations will error.
mongodb

By default, this addon provide MongoDB 4.4.

Exported environment variables:

CLOUDRON_MONGODB_URL=          # mongodb url
CLOUDRON_MONGODB_USERNAME=     # username
CLOUDRON_MONGODB_PASSWORD=     # password
CLOUDRON_MONGODB_HOST=         # server IP/hostname
CLOUDRON_MONGODB_PORT=         # server port
CLOUDRON_MONGODB_DATABASE=     # database name
CLOUDRON_MONGODB_OPLOG_URL=    # oplog access URL (see below)

App can request oplog access by setting the oplog option to be true.

"mongodb": { "oplog": true }

For debugging, cloudron exec can be used to run the mongo shell within the context of the app:

cloudron exec

> mongo -u "${CLOUDRON_MONGODB_USERNAME}" -p "${CLOUDRON_MONGODB_PASSWORD}" ${CLOUDRON_MONGODB_HOST}:${CLOUDRON_MONGODB_PORT}/${CLOUDRON_MONGODB_DATABASE}

mysql

By default, this addon provides a single database on MySQL 8.0.31. The database is already created and the application only needs to create the tables.

Exported environment variables:

CLOUDRON_MYSQL_URL=            # the mysql url (only set when using a single database, see below)
CLOUDRON_MYSQL_USERNAME=       # username
CLOUDRON_MYSQL_PASSWORD=       # password
CLOUDRON_MYSQL_HOST=           # server IP/hostname
CLOUDRON_MYSQL_PORT=           # server port
CLOUDRON_MYSQL_DATABASE=       # database name (only set when using a single database, see below)

For debugging, cloudron exec can be used to run the mysql client within the context of the app:

cloudron exec

> mysql --user=${CLOUDRON_MYSQL_USERNAME} --password=${CLOUDRON_MYSQL_PASSWORD} --host=${CLOUDRON_MYSQL_HOST} ${CLOUDRON_MYSQL_DATABASE}

The multipleDatabases option can be set to true if the app requires more than one database. When enabled, the following environment variables are injected and the MYSQL_DATABASE is removed:

CLOUDRON_MYSQL_DATABASE_PREFIX=      # prefix to use to create databases

All the databases use utf8mb4 encoding by default.

mysql> SELECT @@character_set_database, @@collation_database;
+--------------------------+----------------------+
| @@character_set_database | @@collation_database |
+--------------------------+----------------------+
| utf8mb4                  | utf8mb4_unicode_ci   |
+--------------------------+----------------------+

To see the charset of a table: SHOW CREATE TABLE <tablename>. Columns can have a collation order of their own which can seen using SHOW TABLE STATUS LIKE <tablename>.
oidc

This addon provides OpenID connect based authentication.

Options:

"oidc": {
    "loginRedirectUri": "/auth/openid/callback",
    "logoutRedirectUri": "/home",
    "tokenSignatureAlgorithm": "RS256"
}

    loginRedirectUri where the user should be redirected to after successful authorization (only URL path, will be prefixed with app domain). Multiple ones can be provided, separated with comma (eg. "/auth/login, app.immich:/").
    logoutRedirectUri where the user should be redirected to after successful logout (only URL path, will be prefixed with app domain)
    tokenSignatureAlgorithm can be either "RS256" or "EdDSA"

Exported environment variables:

CLOUDRON_OIDC_PROVIDER_NAME=     # The name of the provider. To be used for "Login with {{providerName}}" button in the login screen.
CLOUDRON_OIDC_DISCOVERY_URL=     # .well-known URL for auto-provisioning
CLOUDRON_OIDC_ISSUER=            # main OpenID provider URI
CLOUDRON_OIDC_AUTH_ENDPOINT=     # auth endpoint - mostly optional
CLOUDRON_OIDC_TOKEN_ENDPOINT=    # token endpoint - mostly optional
CLOUDRON_OIDC_KEYS_ENDPOINT=     # keys endpoint - mostly optional
CLOUDRON_OIDC_PROFILE_ENDPOINT=  # profile endpoint - mostly referred to as /me or /profile
CLOUDRON_OIDC_CLIENT_ID=         # client id
CLOUDRON_OIDC_CLIENT_SECRET=     # client secret

postgresql

By default, this addon provides PostgreSQL 14.9

Exported environment variables:

CLOUDRON_POSTGRESQL_URL=       # the postgresql url
CLOUDRON_POSTGRESQL_USERNAME=  # username
CLOUDRON_POSTGRESQL_PASSWORD=  # password
CLOUDRON_POSTGRESQL_HOST=      # server name
CLOUDRON_POSTGRESQL_PORT=      # server port
CLOUDRON_POSTGRESQL_DATABASE=  # database name

The postgresql addon whitelists the following extensions:

    address_standardizer;
    address_standardizer_data_us
    btree_gist
    btree_gin
    citext
    cube
    earthdistance
    fuzzystrmatch
    hstore
    ogr_fdw
    pgcrypto
    pg_stat_statements
    pg_trgm
    pgrouting
    plpgsql
    postgis
    postgis_tiger_geocoder
    postgis_sfcgal
    postgis_topology
    postgres_fdw
    uuid-ossp
    unaccent
    vector
    vectors

For debugging, cloudron exec can be used to run the psql client within the context of the app:

cloudron exec

> PGPASSWORD=${CLOUDRON_POSTGRESQL_PASSWORD} psql -h ${CLOUDRON_POSTGRESQL_HOST} -p ${CLOUDRON_POSTGRESQL_PORT} -U ${CLOUDRON_POSTGRESQL_USERNAME} -d ${CLOUDRON_POSTGRESQL_DATABASE}

The locale option can be set to a valid PostgreSQL locale. When set, LC_LOCALE and LC_CTYPE of the database are set upon creation accordingly.
proxyAuth

The proxyAuth addon can be used to setup an authentication wall in front of the app.

With the authentication wall, users will be faced with a login screen when visiting the app and have to login before being able to use it. The login screen uses a session (cookie) based authentication. It is also possible to login using HTTP Basic auth using the Authorization header.

The path property can be set if you want to restrict the wall to a subset of pages. For example:

"proxyAuth": { "path": "/admin" }

The path can also start with '!' to restrict all paths except those starting with that. For example:

"proxyAuth": { "path": "!/webhooks" }

The basicAuth property can be set to enable HTTP basic authentication. Enabling this property allows a user to bypass 2FA. For this reason, it is disabled by default.

The supportsBearerAuth can be set to indicate that an app supports bearer token authentication using the Authorization header. When set, all requests with Bearer in the Authorization header are forwarded to the app.

This flag utilizes two special routes - /login and /logout. These routes are unavailable to the app itself.
Cannot add to existing app

Due to a limitation of the platform, authentication cannot be added dynamically to an existing app. The app must be reinstalled.
recvmail

The recvmail addon can be used to receive email for the application.

Exported environment variables:

CLOUDRON_MAIL_IMAP_SERVER=     # the IMAP server. this can be an IP or DNS name
CLOUDRON_MAIL_IMAP_PORT=       # the IMAP server port
CLOUDRON_MAIL_IMAPS_PORT=      # the IMAP TLS server port
CLOUDRON_MAIL_POP3_PORT=       # the POP3 server port
CLOUDRON_MAIL_POP3S_PORT=      # the POP3 TLS server port
CLOUDRON_MAIL_IMAP_USERNAME=   # the username to use for authentication
CLOUDRON_MAIL_IMAP_PASSWORD=   # the password to use for authentication
CLOUDRON_MAIL_TO=              # the "To" address to use
CLOUDRON_MAIL_TO_DOMAIN=       # the mail for which email will be received

recvmail addon can be disabled for the cases where Cloudron is not receiving email for the domain. For this reason, apps must be prepared for the environment variables above to be missing.

For debugging, cloudron exec can be used to run the openssl tool within the context of the app:

cloudron exec

> openssl s_client -connect "${CLOUDRON_MAIL_IMAP_SERVER}:${CLOUDRON_MAIL_IMAP_PORT}" -crlf

The IMAP command ? LOGIN username password can then be used to test the authentication.
redis

By default, this addon provides redis 6.0. The redis is configured to be persistent and data is preserved across updates and restarts.

Exported environment variables:

CLOUDRON_REDIS_URL=            # the redis url
CLOUDRON_REDIS_HOST=           # server name
CLOUDRON_REDIS_PORT=           # server port
CLOUDRON_REDIS_PASSWORD=       # password

App can choose to not use a password access by setting the noPassword option to be true. Since redis is only available reachable in the server's internal docker network, this is not a security issue.

"redis": { "noPassword": true }

For debugging, cloudron exec can be used to run the redis-cli client within the context of the app:

cloudron exec

> redis-cli -h "${CLOUDRON_REDIS_HOST}" -p "${CLOUDRON_REDIS_PORT}" -a "${CLOUDRON_REDIS_PASSWORD}"

scheduler

The scheduler addon can be used to run tasks at periodic intervals (cron).

Scheduler can be configured as below:

    "scheduler": {
        "update_feeds": {
            "schedule": "*/5 * * * *",
            "command": "/app/code/update_feed.sh"
        }
    }

In the above example, update_feeds is the name of the task and is an arbitrary string.

schedule values must fall within the following ranges:

    Minutes: 0-59
    Hours: 0-23
    Day of Month: 1-31
    Months: 0-11
    Day of Week: 0-6

NOTE: scheduler does not support seconds

schedule supports ranges (like standard cron):

    Asterisk. E.g. *
    Ranges. E.g. 1-3,5
    Steps. E.g. */2

command is executed through a shell (sh -c). The command runs in the same launch environment as the application. Environment variables, volumes (/tmp and /run) are all shared with the main application.

Tasks are given a grace period of 30 minutes to complete. If a task is still running after 30 minutes and a new instance of the task is scheduled to be started, the previous task instance is killed.
sendmail

The sendmail addon can be used to send email from the application.

Exported environment variables:

CLOUDRON_MAIL_SMTP_SERVER=       # the mail server (relay) that apps can use. this can be an IP or DNS name
CLOUDRON_MAIL_SMTP_PORT=         # the mail server port. Currently, this port disables TLS and STARTTLS.
CLOUDRON_MAIL_SMTPS_PORT=        # SMTPS server port.
CLOUDRON_MAIL_SMTP_USERNAME=     # the username to use for authentication
CLOUDRON_MAIL_SMTP_PASSWORD=     # the password to use for authentication
CLOUDRON_MAIL_FROM=              # the "From" address to use (i.e username@domain)
CLOUDRON_MAIL_FROM_DISPLAY_NAME= # the email Display name to use for the "From" address
CLOUDRON_MAIL_DOMAIN=            # the domain name to use for email sending (i.e only the domain part of username@domain)

The SMTP server does not require STARTTLS. If STARTTLS is used, the app must be prepared to accept self-signed certs.

For debugging, cloudron exec can be used to run the swaks tool within the context of the app:

cloudron exec

> swaks --server "${CLOUDRON_MAIL_SMTP_SERVER}" -p "${CLOUDRON_MAIL_SMTP_PORT}" --from "${CLOUDRON_MAIL_FROM}" --body "Test mail from cloudron app at $(hostname -f)" --auth-user "${CLOUDRON_MAIL_SMTP_USERNAME}" --auth-password "${CLOUDRON_MAIL_SMTP_PASSWORD}"


> swaks --server "${CLOUDRON_MAIL_SMTP_SERVER}" -p "${CLOUDRON_MAIL_SMTPS_PORT}" --from "${CLOUDRON_MAIL_FROM}" --body "Test mail from cloudron app at $(hostname -f)" --auth-user "${CLOUDRON_MAIL_SMTP_USERNAME}" --auth-password "${CLOUDRON_MAIL_SMTP_PASSWORD}" -tlsc

The optional flag can be set to true for apps that allow the user to completely take over the email configuration. When set, all the above environment variables will be absent at runtime.

The supportsDisplayName flag can be set to true for apps that allow the user to set the mail from display name. When enabled, the CLOUDRON_MAIL_FROM_DISPLAY_NAME environment variable is set.

requiresValidCertificate can be set to true for apps that require a valid mail server certificate to send email. When set, Cloudron will set CLOUDRON_MAIL_SMTP_SERVER to the FQDN of the mail server. In addition, it will reconfigure the app automatically when the domain name of the mail server changes.
tls

The tls addon can be used to access the certs of the primary domain of an app.

App sometimes require access to certs when implementing protocols like IRC or DNS-Over-TLS. Such apps can request access to certs using the tls addon.

The cert and key are made available (as readonly) in /etc/certs/tls_cert.pem and /etc/certs/tls_key.pem respectively. The app will be automatically restarted when the cert is renewed.
turn

The turn addon can be access the STUN/TURN service.

Exported environment variables:

CLOUDRON_TURN_SERVER=           # turn server name
CLOUDRON_TURN_PORT=             # turn server port
CLOUDRON_TURN_TLS_PORT          # turn server TLS port
CLOUDRON_TURN_SECRET            # turn server secret

