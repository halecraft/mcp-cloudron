Packaging Tutorial
Overview

This tutorial outlines how to package a web application for the Cloudron.

Creating an application for Cloudron can be summarized as follows:

    Create a Dockerfile for your application.

    Create a CloudronManifest.json. This file specifies the addons (like database) required to run your app. When the app runs on the Cloudron, it will have environment variables set for connecting to the addon.

    Build the app using docker build and push the image to any public or private docker registry using docker push. To help out with the build & push workflow, you can use cloudron build.

    Install the app on the cloudron using cloudron install --image <image>.

    Update the app on the cloudron using cloudron update --image <newimage>.

Prerequisites
Cloudron CLI

Cloudron CLI is a command line tool used for building and installing custom apps for Cloudron. You can install the CLI tool on your PC/Mac as follows:

$ sudo npm install -g cloudron

You can login to your Cloudron now:

$ cloudron login my.example.com
Enter credentials for my.example.com:
Username: girish
Password:
Login successful.

cloudron --help provides a list of all the available commands. See CLI docs for a quick overview.
Docker

Docker is used for building application images. You can install it from here.
Sample app

We will package a simple app to understand how the packaging flow works. You can clone any of the following repositories to get started (you can also use cloudron init to create a bare bone app):

    Nodejs App

    $ git clone https://git.cloudron.io/docs/tutorial-nodejs-app

    Typescript App

    $ git clone https://git.cloudron.io/docs/tutorial-typescript-app

    PHP App

    $ git clone https://git.cloudron.io/docs/tutorial-php-app

    Multi-process App

    $ git clone https://git.cloudron.io/docs/tutorial-supervisor-app

All our published apps are Open Source and available in our git. You can use any of those as a starting point.
Build

The next step is to build the docker image and push the image to a repository.

# enter app directory
$ cd nodejs-app

# build the app
$ docker build -t username/nodejs-app:1.0.0 .

# push the image. if the push fails, you have to 'docker login' with your username
$ docker push username/nodejs-app:1.0.0

Install

If you use the public docker registry, Cloudron can pull the app image that you built with no authentication. If you use a private registry, Cloudron has to be configured with the private registry credentials. You can do this in the Settings view of Cloudron.

We are now ready to install the app on Cloudron.

# be sure to be in the app directory
$ cd tutorial-nodejs-app

$ cloudron install --image username/nodejs-app:1.0.0 --location app.example.com
App is being installed.

 => Starting ...
 => Registering subdomains
 => Downloading image ....
 => Setting up collectd profile

App is installed.

Private registry

If you are using a private registry for your image, first configure Cloudron with the private registry credentials. Then, prefix the registry to --image. E.g cloudron install --image docker.io/username/nodejs-app:1.0.0.

Open the app in your default browser:

$ cloudron open

You should see Hello World on your browser.
Logs

You can view the logs using cloudron logs. When the app is running you can follow the logs using cloudron logs -f.

For example, you can see the console.log output in our server.js with the command below:

$ cloudron logs
Using cloudron craft.selfhost.io
16:44:11 [main] Server running at port 8000

Update

To update the application, simply build a new docker image and apply the update:

$ docker build -t username/nodejs-app:2.0.0 .
$ docker push username/nodejs-app:2.0.0
$ cloudron update --image username/nodejs-app:2.0.0

Note that you must provide a tag different from the existing installation for the docker image when calling cloudron update. This is because, if the tag stays the same, the Docker client does not check the registry to see if the local image and remote image differ.

To workaround this, we recommend that you tag docker images using a timestamp:

$ NOW=$(date +%s)
$ docker build -t username/nodejs-app:$NOW
$ docker push username/nodejs-app:$NOW
$ cloudron install --image username/nodejs-app:$NOW

Alternately, the cloudron build command automates the above workflow. The build command remembers the registry and repository name as well (in ~/.cloudron.json).

You can do this instead:

# this command will ask the repository name on first run
$ cloudron build
Enter repository (e.g registry/username/com.example.cloudronapp): girish/nodejs-app

Building com.example.cloudronapp locally as girish/nodejs-app:20191113-014051-30452a2c5
...
Pushing girish/nodejs-app:20191113-014051-30452a2c5
...

# the tool remembers the last docker image built and installs that
$ cloudron update
Location: app.cloudron.ml
App is being installed.

 => Starting ...
 => Registering subdomains
 => Creating container

App is updated.

This way you can just use cloudron build and cloudron update repeatedly for app development.
Build service

Building docker images locally might require many CPU resources depending on your app. Pushing docker images can also be network intensive. If you hit these constraints, we recommend using the Docker Builder App. The builder app is installed on a separate Cloudron (not production Cloudron) and acts as a proxy for building docker images and also pushes them to your registry.
Next steps

This concludes our simple tutorial on building a custom app for Cloudron.

There are various Cloudron specific considerations when writing the Dockerfile. You can read about them in the development guide.
