Cloudron CLI
Overview

Cloudron CLI is a command line tool used for building and installing custom apps for Cloudron.

All CLI commands operate on 'apps' and not on the server. For example, cloudron restart, cloudron uninstall etc are operating on an app and not the server.
Installing

Cloudron CLI is distributed via npm. The Cloudron CLI can be installed on Linux/Mac using the following command:

sudo npm install -g cloudron

The Cloudron CLI is not actively tested on Windows but is known to work with varying success. If you use Windows, we recommend using a Linux VM instead.

!!! warning "Do not install on Cloudron"

The Cloudron CLI is intended to be installed on your PC/Mac and should NOT be installed on the Cloudron.
Updating

Cloudron CLI can be updated using the following command:

npm install -g cloudron@<version>

Login

Use the login command to authenticate with your Cloudron:

cloudron login my.example.com

A successful login stores the authentication token in ~/.cloudron.json.
Self-signed certificates

When using Cloudron with self-signed certificates, use the --allow-selfsigned option.
Listing apps

Use the list command to display the installed apps:

cloudron list

The Id is the unique application instance id. Location is the domain in which the app is installed. You can use either of these fields as the argument to --app.
Viewing logs

To view the logs of an app, use the logs command:

cloudron logs --app blog.example.com
cloudron logs --app 52aae895-5b7d-4625-8d4c-52980248ac21

Pass the -f to follow the logs. Note that not all apps log to stdout/stderr. For this reason, you may need to look further in the file system for logs:

cloudron exec --app blog.example.com       # shell into the app's file system
# tail -f /run/wordpress/wp-debug.log      # note that log file path and name is specific to the app

Pushing a file

To push a local file (i.e on the PC/Mac) to the app's file system, use the push command:

cloudron push --app blog.example.com dump.sql /tmp/dump.sql
cloudron push --app blog.example.com dump.sql /tmp/               # same as above. trailing slash is required

To push a directory recursively to the app's file system, use the following command:

cloudron push --app blog.example.com files /tmp

Pulling a file

To pull a file from apps's file system to the PC/Mac, use the pull command:

cloudron pull --app blog.example.com /app/code/wp-includes/load.php .  # pulls file to current dir

To pull a directory from the app's file system, use the following command:

cloudron pull --app blog.example.com /app/code/ .            # pulls content of code to current dir
cloudron pull --app blog.example.com /app/code/ code_backup  # pulls content of code to ./code_backup

Environment variables

To set an environment variable(s):

cloudron env set --app blog.example.com RETRY_INTERVAL=4000 RETRY_TIMEOUT=12min

To unset an environment variable:

cloudron env unset --app blog.example.com RETRY_INTERVAL

To list environment variables:

cloudron env list --app blog.example.com

To list a single environment variable:

cloudron env get --app blog.example.com RETRY_INTERVAL

Application Shell

On the Cloudron, apps are containerized and run with a virtual file system. To navigate the file system, use the exec command:

cloudron exec --app blog.example.com

Apart from 3 special directories - /app/data, /run and /tmp, the file system of an app is read-only. Changes made to /run and /tmp will be lost across restarts (they are also cleaned up periodically).
Execute a command

The Cloudron CLI tool can be used to execute arbitrary commands in the context of app.

cloudron exec --app blog.example.com
# ls                             # list files in the app's current dir
# mysql --user=${MYSQL_USERNAME} --password=${MYSQL_PASSWORD} --host=${MYSQL_HOST} ${MYSQL_DATABASE} # connect to app's mysql

It's possible to pass a command with options by using the -- to indicate end of arguments list:

cloudron exec --app blog.example.com -- ls -l

If the command has environment variables, then execute it using a shell:

cloudron exec --app blog.example.com -- bash -c 'mysql --user=${CLOUDRON_MYSQL_USERNAME} --password=${CLOUDRON_MYSQL_PASSWORD} --host=${CLOUDRON_MYSQL_HOST} ${CLOUDRON_MYSQL_DATABASE} -e "SHOW TABLES"';

CI/CD

To integrate the CLI tool as part of a CI/CD pipeline, you can use --server and --token arguments. You can get tokens by navigating to https://my.example.com/#/profile.

cloudron update --server my.example.com --token 001e7174c4cbad2272 --app blog.example.com --image username/image:tag

