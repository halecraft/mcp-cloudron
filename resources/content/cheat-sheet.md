Cheat Sheet

This cheat sheet covers various Cloudron specific considerations, caveats and best practices when deploying apps on Cloudron.
Dockerfile.cloudron

If you already have an existing Dockerfile in your project, you can name the Cloudron specific Dockerfile as Dockerfile.cloudron or cloudron/Dockerfile.
Examples

We have tagged many of our existing app packages by framework/language. You can also ask for help in our forum.

    https://git.cloudron.io/explore/projects?tag=php
    https://git.cloudron.io/explore/projects?tag=java
    https://git.cloudron.io/explore/projects?tag=rails
    https://git.cloudron.io/explore/projects?tag=ruby
    https://git.cloudron.io/explore/projects?tag=node
    https://git.cloudron.io/explore/projects?tag=meteor
    https://git.cloudron.io/explore/projects?tag=python
    https://git.cloudron.io/explore/projects?tag=rust
    https://git.cloudron.io/explore/projects?tag=nginx
    https://git.cloudron.io/explore/projects?tag=go

Filesystem
Read-only

The application container created on the Cloudron has a readonly file system. Writing to any location at runtime other than the below will result in an error:
Dir	Description
/tmp	Use this location for temporary files. The Cloudron will cleanup any files in this directory periodically.
/run	Use this location for runtime configuration and dynamic data. These files should not be expected to persist across application restarts (for example, after an update or a crash).
/app/data	Use this location to store application data that is to be backed up. To use this location, you must use the localstorage addon.
Other paths	Not writable

Suggestions for creating the Dockerfile:

    Install any required packages in the Dockerfile.
    Create static configuration files in the Dockerfile.
    Create symlinks to dynamic configuration files (for e.g a generated config.php) under /run in the Dockerfile.

One-time init

A common requirement is to perform some initialization the very first time the app is installed. You can either use the database or the filesystem to track the app's initialization state. For example, create a /app/data/.initialized file to track the status. We can save this file in /app/data because this is the only location that is persisted across restarts and updates.

if [[ ! -f /app/data/.initialized ]]; then
  echo "Fresh installation, setting up data directory..."
  # Setup commands here
  touch /app/data/.initialized
  echo "Done."
fi

File ownership

When storing files under /app/data, be sure to change the ownership of the files to match the app's user id before the app starts. This is required because ownership information can be "lost" across backup/update/restore. For example, if the app runs as the cloudron user, do this:

# change ownership of files
chown -R cloudron:cloudron /app/data

# start the app
gosu cloudron:cloudron npm start

For Apache+PHP apps you might need to change permissions to www-data:www-data instead.
Start script

Many apps do not launch the server directly. Instead, they execute a start.sh script (named so by convention, you can name it whatever you like) which is used as the app entry point.

At the end of the Dockerfile you should add your start script (start.sh) and set it as the default command. Ensure that the start.sh is executable in the app package repo. This can be done with chmod +x start.sh.

ADD start.sh /app/code/start.sh
CMD [ "/app/code/start.sh" ]

Non-root user

Cloudron runs the start.sh as root user. This is required for various commands like chown to work as expected. However, to keep the app and cloudron secure, always run the app with the least required permissions.

The gosu tool lets you run a binary with a specific user/group as follows:

/usr/local/bin/gosu cloudron:cloudron node /app/code/.build/bundle/main.js

Environment variables

The following environment variables are set as part of the application runtime.
Name	Description
CLOUDRON	Set to '1'. This is useful for writing Cloudron specific code
CLOUDRON_ALIAS_DOMAINS	Set to the domain aliases. Only set when multiDomain flag is enabled
CLOUDRON_API_ORIGIN	Set to the HTTP(S) origin of this Cloudron's API. For example, https://my.example.com
CLOUDRON_APP_DOMAIN	The domain name of the application. For example, app.example.com
CLOUDRON_APP_ORIGIN	The HTTP(s) origin of the application. For example, https://app.example.com
CLOUDRON_PROXY_IP	The IP address of the Cloudron reverse proxy. Apps can trust the HTTP headers (like X-Forwarded-For) for requests originating from this IP address.
CLOUDRON_WEBADMIN_ORIGIN	The HTTP(S) origin of the Cloudron's dashboard. For example, https://my.example.com

You can set custom environment variables using cloudron env.
Logging

Cloudron applications stream their logs to stdout and stderr. Logging to stdout has many advantages:

    App does not need to rotate logs and the Cloudron takes care of managing logs.
    App does not need special mechanism to release log file handles (on a log rotate).
    Integrates better with tooling like cloudron cli.

In practice, this ideal is hard to achieve. Some programs like apache simply don't log to stdout. In such cases, simply log to a subdirectory in /run (two levels deep) into files with .log extension and Cloudron will autorotate the logs.
Multiple processes

Docker supports restarting processes natively. Should your application crash, it will be restarted automatically. If your application is a single process, you do not require any process manager.

Use supervisor, pm2 or any of the other process managers if your application has more then one component. This excludes web servers like apache, nginx which can already manage their children by themselves. Be sure to pick a process manager that forwards signals to child processes.
supervisor

Supervisor can be configured to send the app's output to stdout as follows:

[program:app]
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

Memory Limit

By default, applications get 256MB RAM (including swap). This can be changed using the memoryLimit field in the manifest.

Design your application runtime for concurrent use by 100s of users. Cloudron is not designed for concurrent access by 1000s of users.

An app can determine it's memory limit by reading /sys/fs/cgroup/memory/memory.limit_in_bytes if the system uses groups v1 or /sys/fs/cgroup/memory.max for cgroups v2. For example, to spin one worker for every 150M RAM available to the app:

if [[ -f /sys/fs/cgroup/cgroup.controllers ]]; then # cgroup v2
    memory_limit=$(cat /sys/fs/cgroup/memory.max)
    [[ "${memory_limit}" == "max" ]] && memory_limit=$(( 2 * 1024 * 1024 * 1024 )) # "max" really means unlimited
else
    memory_limit=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes) # this is the RAM. we have equal amount of swap
fi
worker_count=$((memory_limit/1024/1024/150)) # 1 worker for 150M
worker_count=$((worker_count > 8 ? 8 : worker_count )) # max of 8
worker_count=$((worker_count < 1 ? 1 : worker_count )) # min of 1

SIGTERM handling

bash, by default, does not automatically forward signals to child processes. This would mean that a SIGTERM sent to the parent processes does not reach the children. For this reason, be sure to exec as the last line of the start.sh script. Programs like gosu, nginx, apache do proper SIGTERM handling.

For example, start apache using exec as below:

echo "Starting apache"
APACHE_CONFDIR="" source /etc/apache2/envvars
rm -f "${APACHE_PID_FILE}"
exec /usr/sbin/apache2 -DFOREGROUND

Debugging

To inspect the filesystem of a running app, use cloudron exec.

If an application keeps restarting (because of some bug), then cloudron exec will not work or will keep getting disconnected. In such situations, you can use cloudron debug. In debug mode, the container's file system is read-write. In addition, the app just pauses and does not run the RUN command specified in the Dockerfile.

You can turn off debugging mode using cloudron debug --disable.
Popular stacks
Apache

Apache requires some configuration changes to work properly with Cloudron. The following commands configure Apache in the following way:

    Disable all default sites
    Print errors into the app's log and disable other logs
    Limit server processes to 5 (good default value)
    Change the port number to Cloudron's default 8000

RUN rm /etc/apache2/sites-enabled/* \
    && sed -e 's,^ErrorLog.*,ErrorLog "/dev/stderr",' -i /etc/apache2/apache2.conf \
    && sed -e "s,MaxSpareServers[^:].*,MaxSpareServers 5," -i /etc/apache2/mods-available/mpm_prefork.conf \
    && a2disconf other-vhosts-access-log \
    && echo "Listen 8000" > /etc/apache2/ports.conf

Afterwards, add your site config to Apache:

ADD apache2.conf /etc/apache2/sites-available/app.conf
RUN a2ensite app

In start.sh Apache can be started using these commands:

echo "Starting apache..."
APACHE_CONFDIR="" source /etc/apache2/envvars
rm -f "${APACHE_PID_FILE}"
exec /usr/sbin/apache2 -DFOREGROUND

Nginx

nginx is often used as a reverse proxy in front of the application, to dispatch to different backend programs based on the request route or other characteristics. In such a case it is recommended to run nginx and the application through a process manager like supervisor.

Example nginx supervisor configuration file:

[program:nginx]
directory=/tmp
command=/usr/sbin/nginx -g "daemon off;"
user=root
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

The nginx configuration, provided with the base image, can be used by adding an application specific config file under /etc/nginx/sites-enabled/ when building the docker image.

ADD <app config file> /etc/nginx/sites-enabled/<app config file>

Since the base image nginx configuration is unpatched from the ubuntu package, the application configuration has to ensure nginx is using /run/ instead of /var/lib/nginx/ to support the read-only filesystem nature of a Cloudron application.

Example nginx app config file:

client_body_temp_path /run/client_body;
proxy_temp_path /run/proxy_temp;
fastcgi_temp_path /run/fastcgi_temp;
scgi_temp_path /run/scgi_temp;
uwsgi_temp_path /run/uwsgi_temp;

server {
  listen 8000;

  root /app/code/dist;

  location /api/v1/ {
    proxy_pass http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
  }
}

PHP

PHP wants to store session data at /var/lib/php/sessions which is read-only in Cloudron. To fix this problem you can move this data to /run/php/sessions with these commands:

RUN rm -rf /var/lib/php/sessions && ln -s /run/php/sessions /var/lib/php/sessions

Don't forget to create this directory and it's ownership in the start.sh:

mkdir -p /run/php/sessions
chown www-data:www-data /run/php/sessions

Java

Java scales its memory usage dynamically according to the available system memory. Due to how Docker works, Java sees the hosts total memory instead of the memory limit of the app. To restrict Java to the apps memory limit it is necessary to add a special parameter to Java calls.

if [[ -f /sys/fs/cgroup/cgroup.controllers ]]; then # cgroup v2
    ram=$(cat /sys/fs/cgroup/memory.max)
    [[ "${ram}" == "max" ]] && ram=$(( 2 * 1024 * 1024 * 1024 )) # "max" means unlimited
else
    ram=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes) # this is the RAM. we have equal amount of swap
fi

ram_mb=$(numfmt --to-unit=1048576 --format "%fm" $ram)
export JAVA_OPTS="-XX:MaxRAM=${ram_mb}M"
java ${JAVA_OPTS} -jar ...

