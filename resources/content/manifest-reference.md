Manifest
Overview

Every Cloudron Application contains a CloudronManifest.json that contains two broad categories of information:

    Information for installing the app on the Cloudron. This includes fields like httpPort, tcpPorts, udpPorts.

    Information about displaying the app on the Cloudron App Store. For example, the title, author information, description etc. When developing a custom app (i.e not part of the App Store), these fields are not required.

Here is an example manifest:

{
  "id": "com.example.test",
  "title": "Example Application",
  "author": "Girish Ramakrishnan <girish@cloudron.io>",
  "description": "This is an example app",
  "tagline": "A great beginning",
  "version": "0.0.1",
  "healthCheckPath": "/",
  "httpPort": 8000,
  "addons": {
    "localstorage": {}
  },
  "manifestVersion": 2,
  "website": "https://www.example.com",
  "contactEmail": "support@clourdon.io",
  "icon": "file://icon.png",
  "tags": [ "test", "collaboration" ],
  "mediaLinks": [ "https://images.rapgenius.com/fd0175ef780e2feefb30055be9f2e022.520x343x1.jpg" ]
}

Fields
addons

Type: object

Required: no

Allowed keys

    email
    ldap
    localstorage
    mongodb
    mysql
    oidc
    postgresql
    proxyauth
    recvmail
    redis
    sendmail
    scheduler
    tls

The addons object lists all the addons and the addon configuration used by the application.

Example:

  "addons": {
    "localstorage": {},
    "mongodb": {}
  }

author

Type: string

Required: no

The author field contains the name and email of the app developer (or company).

Example:

  "author": "Cloudron UG <girish@cloudron.io>"

capabilities

Type: array of strings

Required: no

The capabilities field can be used to request extra capabilities.

By default, Cloudron apps are unprivileged and cannot perform many operations including changing network configuration, launch docker containers etc.

Currently, the permitted capabilities are:

    net_admin - This capability can be used to perform various network related operations like:
        Interface configuration
        Administration of IP firewall, masquerading, and accounting
        Modify routing tables

    mlock - This prevents memory from being swapped to disk (CAP_IPC_LOCK).

    ping - This provides NET_RAW

    vaapi - This provides the container access to the VAAPI devices under /dev/dri. This capability was added in Cloudron 5.6.

Example:

  "capabilities": [
    "net_admin"
  ]

changelog

Type: markdown string

Required: no

The changelog field contains the changes in this version of the application. This string can be a markdown style bulleted list.

Example:

  "changelog": "* Add support for IE8 \n* New logo"

checklist

Type: object

Required: no

Syntax: Each key is a checklist item that contains a message. An optional sso flag may be specified.

The checklist is a list of items to be completed post installation. The items can be individually tracked - completed or not, by whom and when.

To illustrate, the application lists the checklists below:

    "checklist": {
      "todo-for-admins": { "message": "Please do this and that after installation" },
      "first-user": { "sso": true, "message": "SSO Example: First user becomes admin" },
      "change-password": { "sso": false, "message": "NoSSO Example: Change admin password on first use" }
    },

In the above example:

    message is a markdown string explaining the todo item

    sso flag can be used to control when the checklist item is applicable depending on the authentication setup.
        If sso is true, the checklist item is shown only when an app is installed with Cloudron authentication.
        If sso is false, the checklist item is shown only when an app is installed without Cloudron authentication.
        If sso is missing, the checklist item is shown regardless of Cloudron authentication.

checklist items can be added or removed over the lifetime of a package. The platform tracks the package version when a checklist item was added (based on the key).
configurePath

Type: url path

Required: no

If this field is present, admins will see an additional link for an app in the dashboard. This url path will be prefixed with the app's domain and thus allows to put a direct link to an admin or settings panel in the app. This is useful for apps like WordPress or Ghost, which depending on the theme might not have admin login links visible on the page.

Example:

  "configurePath": "/wp-admin/"

contactEmail

Type: email

Required: no

The contactEmail field contains the email address that Cloudron users can contact for any bug reports and suggestions.

Example:

  "contactEmail": "support@testapp.com"

description

Type: markdown string

Required: no

The description field contains a detailed description of the app. This information is shown to the user when they install the app from the Cloudron App Store.

Example:

  "description": "This is a detailed description of this app."

A large description can be unweildy to manage and edit inside the CloudronManifest.json. For this reason, the description can also contain a file reference. The Cloudron CLI tool fills up the description from this file when publishing your application.

Example:

  "description:": "file://DESCRIPTION.md"

documentationUrl

Type: url

Required: no

The documentationUrl field is a URL where the user can read docs about the application.

Example:

  "documentationUrl": "https://example.com/myapp/docs"

forumUrl

Type: url

Required: no

The forumUrl field is a URL where the user can get forum support for the application.

Example:

  "forumUrl": "https://example.com/myapp/forum"

healthCheckPath

Type: url path

Required: yes

The healthCheckPath field is used by the Cloudron Runtime to determine if your app is running and responsive. The app must return a 2xx HTTP status code as a response when this path is queried. In most cases, the default "/" will suffice but there might be cases where periodically querying "/" is an expensive operation. In addition, the app might want to use a specialized route should it want to perform some specialized internal checks.

Example:

  "healthCheckPath": "/"

httpPort

Type: positive integer

Required: yes

The httpPort field contains the TCP port on which your app is listening for HTTP requests. This is the HTTP port the Cloudron will use to access your app internally.

While not required, it is good practice to mark this port as EXPOSE in the Dockerfile.

Cloudron Apps are containerized and thus two applications can listen on the same port. In reality, they are in different network namespaces and do not conflict with each other.

Note that this port has to be HTTP and not HTTPS or any other non-HTTP protocol. HTTPS proxying is handled by the Cloudron platform (since it owns the certificates).

Example:

  "httpPort": 8080

httpPorts

Type: object

Required: no

Syntax: Each key is the environment variable. Each value is an object containing title, description, containerPort and defaultValue.

The httpPorts field provides information on extra HTTP services that your application provides. During installation, the user can provide location information for these services.

To illustrate, the application lists the ports as below:

  "httpPorts": {
    "API_SERVER_DOMAIN": {
      "title": "API Server Domain",
      "description": "The domain name for MinIO (S3) API requests",
      "containerPort": 9000,
      "defaultValue": "minio-api"
    }
  },

In the above example:

    API_SERVER_DOMAIN is an app specific environment variable. It is set to the domain chosen by the user.

    title is a short one line information about this service.

    description is a multi line description about this service.

    defaultValue is the recommended subdomain value to be shown in the app installation UI.

    containerPort is the HTTP port that the app is listening on for this service.

icon

Type: local image filename

Required: no

The icon field is used to display the application icon/logo in the Cloudron App Store. Icons are expected to be square of size 256x256.

  "icon": "file://icon.png"

id

Type: reverse domain string

Required: no

The id is a unique human friendly Cloudron App Store id. This is similar to reverse domain string names used as java package names. The convention is to base the id based on a domain that you own.

The Cloudron tooling allows you to build applications with any id. However, you will be unable to publish the application if the id is already in use by another application.

  "id": "io.cloudron.testapp"

logPaths

Type: array of paths

Required: no

The logPaths field contains an array of paths that contain the logs.

Whenever possible, apps must be configured to stream logs to stdout and stderr. Only use this field when the app or service is unable to do so.

  "logPaths": [
    "/run/app/app.log",
    "/run/app/workhorse.log"
  ]

manifestVersion

Type: integer

Required: yes

manifestVersion specifies the version of the manifest and is always set to 2.

  "manifestVersion": 2

mediaLinks

Type: array of urls

Required: no

The mediaLinks field contains an array of links that the Cloudron App Store uses to display a slide show of pictures of the application.

They have to be publicly reachable via https and should have an aspect ratio of 3 to 1. For example 600px by 200px (with/height).

  "mediaLinks": [
    "https://s3.amazonaws.com/cloudron-app-screenshots/org.owncloud.cloudronapp/556f6a1d82d5e27a7c4fca427ebe6386d373304f/2.jpg",
    "https://images.rapgenius.com/fd0175ef780e2feefb30055be9f2e022.520x343x1.jpg"
  ]

memoryLimit

Type: bytes (integer)

Required: no

The memoryLimit field is the maximum amount of memory (including swap) in bytes an app is allowed to consume before it gets killed and restarted.

By default, all apps have a memoryLimit of 256MB. For example, to have a limit of 500MB,

  "memoryLimit": 524288000

maxBoxVersion

Type: semver string

Required: no

The maxBoxVersion field is the maximum box version that the app can possibly run on. Attempting to install the app on a box greater than maxBoxVersion will fail.

This is useful when a new box release introduces features which are incompatible with the app. This situation is quite unlikely and it is recommended to leave this unset.

Cloudron updates are blocked, if the Cloudron has an app with a maxBoxVersion less than the upcoming Cloudron version.
minBoxVersion

Type: semver string

Required: no

The minBoxVersion field is the minimum box version that the app can possibly run on. Attempting to install the app on a box lesser than minBoxVersion will fail.

This is useful when the app relies on features that are only available from a certain version of the box. If unset, the default value is 0.0.1.
multiDomain

Type: boolean

Required: no

When set, this app can be assigned additional domains as aliases to the primary domain of the app.
postInstallMessage

Type: markdown string

Required: no

The postInstallMessage field is a message that is displayed to the user after an app is installed.

The intended use of this field is to display some post installation steps that the user has to carry out to complete the installation. For example, displaying the default admin credentials and informing the user to to change it.

The message can have the following special tags:

    <sso> ... </sso> - Content in sso blocks are shown if SSO enabled.
    <nosso> ... </nosso>- Content in nosso blocks are shows when SSO is disabled.

The following variables are dynamically replaced:
Variable	Meaning
$CLOUDRON-APP-LOCATION	App subdomain
$CLOUDRON-APP-DOMAIN	App domain
$CLOUDRON-APP-FQDN	App FQDN (subdomain and domain)
$CLOUDRON-APP-ORIGIN	App origin i.e https://FQDN
$CLOUDRON-API-DOMAIN	Cloudron Dashboard Domain
$CLOUDRON-API-ORIGIN	Cloudron Dashboard Origin ie. https://my.domain.com
$CLOUDRON-USERNAME	Username of the current logged in user
$CLOUDRON-APP-ID	Unique App ID. This can be used generate the deep links into the Cloudron dashboard
optionalSso

Type: boolean

Required: no

The optionalSso field can be set to true for apps that can be installed optionally without using the Cloudron user management.

This only applies if any Cloudron auth related addons are used. When set, the Cloudron will not inject the auth related addon environment variables. Any app startup scripts have to be able to deal with missing env variables in this case.
runtimeDirs

Type: array of paths

Required: no

The runtimeDirs field contains an array of paths that are writable at run time.

On startup, the contents of these directories in the docker image are carried over to the container. Please note that these paths are not backed up. Only subdirectories of /app/code are allowed to be specified. These directories are also not persisted across updates.

  "runtimeDirs": [
    "/app/code/node_modules",
    "/app/code/public"
  ]

tagline

Type: one-line string

Required: no

The tagline is used by the Cloudron App Store to display a single line short description of the application.

  "tagline": "The very best note keeper"

tags

Type: Array of strings

Required: no

The tags are used by the Cloudron App Store for filtering searches by keyword.

  "tags": [ "git", "version control", "scm" ]

Available tags:

    blog
    chat
    git
    email
    sync
    gallery
    notes
    project
    hosting
    wiki

targetBoxVersion

Type: semver string

Required: no

The targetBoxVersion field is the box version that the app was tested on. By definition, this version has to be greater than the minBoxVersion.

The box uses this value to enable compatibility behavior of APIs. For example, an app sets the targetBoxVersion to 0.0.5 and is published on the store. Later, box version 0.0.10 introduces a new feature that conflicts with how apps used to run in 0.0.5 (say SELinux was enabled for apps). When the box runs such an app, it ensures compatible behavior and will disable the SELinux feature for the app.

If unspecified, this value defaults to minBoxVersion.
tcpPorts

Type: object

Required: no

Syntax: Each key is the environment variable. Each value is an object containing title, description and defaultValue. An optional containerPort may be specified.

The tcpPorts field provides information on the non-http TCP ports/services that your application is listening on. During installation, the user can decide how these ports are exposed from their Cloudron.

For example, if the application runs an SSH server at port 29418, this information is listed here. At installation time, the user can decide any of the following:

    Expose the port with the suggested defaultValue to the outside world. This will only work if no other app is being exposed at same port.
    Provide an alternate value on which the port is to be exposed to outside world.
    Disable the port/service.

To illustrate, the application lists the ports as below:

  "tcpPorts": {
    "SSH_PORT": {
      "title": "SSH Port",
      "description": "SSH Port over which repos can be pushed & pulled",
      "defaultValue": 29418,
      "containerPort": 22,
      "portCount": 1
    }
  },

In the above example:

    SSH_PORT is an app specific environment variable. Only strings, numbers and _ (underscore) are allowed. The author has to ensure that they don't clash with platform provided variable names.

    title is a short one line information about this port/service.

    description is a multi line description about this port/service.

    defaultValue is the recommended port value to be shown in the app installation UI.

    containerPort is the port that the app is listening on (recall that each app has it's own networking namespace).

    readOnly flag indicates the port cannot be changed.

    portCount number of ports to allocate in sequence starting with the set port value.

    enabledByDefault flag is a UI hint as to whether this port should be shown as enabled or not at installation time.

In more detail:

    If the user decides to disable the SSH service, this environment variable SSH_PORT is absent. Applications must detect this on start up and disable these services.

    SSH_PORT is set to the value of the exposed port. Should the user choose to expose the SSH server on port 6000, then the value of SSH_PORT is 6000.

    defaultValue is only used for display purposes in the app installation UI. This value is independent of the value that the app is listening on. For example, the app can run an SSH server at port 22 but still recommend a value of 29418 to the user.

    containerPort is the port that the app is listening on. The Cloudron runtime will bridge the user chosen external port with the app specific containerPort. Cloudron Apps are containerized and each app has it's own networking namespace. As a result, different apps can have the same containerPort value because these values are namespaced.

    The environment variable SSH_PORT may be used by the app to display external URLs. For example, the app might want to display the SSH URL. In such a case, it would be incorrect to use the containerPort 22 or the defaultValue 29418 since this is not the value chosen by the user.

    containerPort is optional. When omitted, the bridged port numbers are the same internally and externally. Some apps use the same variable (in their code) for listen port and user visible display strings. When packaging these apps, it might be simpler to listen on SSH_PORT internally. In such cases, the app can omit the containerPort value and should instead reconfigure itself to listen internally on SSH_PORT on each start up.

    portCount is optional. When omitted, the count defaults to 1 and starts with the defaultValue or what the user has configured. The maximum count is 1000 ports. For resource and performance reasons, the number should be as low as possible and cannot overlap with existing ports used by other apps on the system. The port count is exposed as a environment variable with the _COUNT suffix. For example, SSH_PORT_COUNT above.

    enabledByDefault flag is a UI hint as to whether this port should be shown as enabled or not at installation time.

title

Type: string

Required: no

The title is the primary application title displayed on the Cloudron App Store.

Example:

  "title": "Gitlab"

udpPorts

Type: object

Required: no

Syntax: Each key is the environment variable. Each value is an object containing title, description and defaultValue. An optional containerPort may be specified.

The udpPorts field provides information on the non-http TCP ports/services that your application is listening on. During installation, the user can decide how these ports are exposed from their Cloudron.

For example, if the application runs an SSH server at port 29418, this information is listed here. At installation time, the user can decide any of the following:

    Expose the port with the suggested defaultValue to the outside world. This will only work if no other app is being exposed at same port.
    Provide an alternate value on which the port is to be exposed to outside world.
    Disable the port/service.

To illustrate, the application lists the ports as below:

  "udpPorts": {
    "VPN_PORT": {
      "title": "VPN Port",
      "description": "Port over which OpenVPN server listens",
      "defaultValue": 11194,
      "containerPort": 1194,
      "portCount": 1
    }
  },

In the above example:

    VPN_PORT is an app specific environment variable. Only strings, numbers and _ (underscore) are allowed. The author has to ensure that they don't clash with platform profided variable names.

    title is a short one line information about this port/service.

    description is a multi line description about this port/service.

    defaultValue is the recommended port value to be shown in the app installation UI.

    containerPort is the port that the app is listening on (recall that each app has it's own networking namespace).

    readOnly flag indicates the port cannot be changed.

    portCount number of ports to allocate in sequence starting with the set port value. When missing, this value defaults to 1.

upstreamVersion

Type: string

Required: no

The upstreamVersion field specifies the version of the app. This field is only used for display and information purpose.

Example:

  "upsteamVersion": "1.0"

version

Type: semver string

Required: yes

The version field is a semver string that specifies the packages version. The version is used by the Cloudron to compare versions and to determine if an update is available.

Example:

  "version": "1.1.0"

website

Type: url

Required: no

The website field is a URL where the user can read more about the application.

Example:

  "website": "https://example.com/myapp"

