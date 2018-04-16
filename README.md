[![Coverage Status](https://coveralls.io/repos/github/spm-style/cli/badge.svg?branch=master)](https://coveralls.io/github/spm-style/cli?branch=master)
[![Build Status](https://travis-ci.org/spm-style/cli.svg?branch=master)](https://travis-ci.org/spm-style/cli)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fspm-style%2Fcli.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fspm-style%2Fcli?ref=badge_shield)
[![NSP Status](https://nodesecurity.io/orgs/spm/projects/62af19a4-3d64-4da0-9c22-0255d20d7e57/badge)](https://nodesecurity.io/orgs/spm/projects/62af19a4-3d64-4da0-9c22-0255d20d7e57)
[![dependencies](https://david-dm.org/spm-style/cli.svg)](https://david-dm.org/spm-style/cli)
[![Known Vulnerabilities](https://snyk.io/test/github/spm-style/cli/badge.svg)](https://snyk.io/test/github/spm-style/cli)
[![documentation](https://inch-ci.org/github/spm-style/cli.svg)](https://inch-ci.org/github/spm-style/cli)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

# [spm](https://www.spm-style.com)


spm (Style Project Manager) is a front-end project management tool. From the client's requirements to the project maintenance, spm offers a unique workflow for clients, project managers, designers and developers.

Our registry stores graphical components and interfaces and integrates unique front-end project management tools :
- Access creations of myriads of designers and developers, protect or publish yours
- Assemble components, unify their design with your branding and document your projects on-the-go.

All of that, and much more, *FOR FREE*!

spm empowers your projects by allowing collaborators to work together very easily. Moreover, you can sharpen your performances through community's contribution. Of course, if you wish, your code can remain private hosted either by ourselves or within your organization.

spm is made up of two dinstinct pieces :
* our Sandbox, a graphical interface allowing you to discover, experiment a constellation of graphical elements and their customizations and assemble them in downloadable bundles
* our CLI, made for fast and explicit commands

This github repository is our CLI code.

## How to install spm ?

Make sure you have node.js minimum version 6.4.0 and npm 3.10.3, then run

```shell
npm i spm-cli -g
```

the global option matters a lot since it will allow you to use the spm command to launch our CLI

## How does spm work ?

spm is based on 3 different elements :
* modules, which bring customizable components into your code
* projects, bringing powerful enterprise features on the top of modules
* styleguides, defining your modules' or projects' style and best practices

Each element can be shared publicly or privately with a selected community, accessible through spm's registry.

Once an element has been published, it is available on our sandbox platform, where it can be customized and its source code downloaded.

spm stylesheets are powered by [scss](http://sass-lang.com/), the most popular css preprocessing language. But don't worry ! spm works very well with css natively (we still promote scss though :grin: )

The elements' dynamic part are powered by javascript, allowing ES5 and ES6 versions ([until modular scripts are fully supported by browsers](https://caniuse.com/#feat=es6-module)).

Before we dive into our core feature, modules, let's talk a bit more about our CLI.

### spm CLI paradigm

Our CLI can be summoned using the command `spm`.
Here is how it works:

```shell
Usage: spm [options] [command]

  Options:

    -V            output the version number
    -h, --help    output usage information

  Commands:

    user|u        for actions about users
    project|p     for actions about projects
    module|m      for actions about modules
    styleguide|s  for actions about styleguides
    help [cmd]    display help for [cmd]
```

The first argument following `spm` command defines the element you want to interact with :
* project, module or styleguide, as detailed above
* user, in order to interact with your spm profile

After this argument, you can select the action you request, and its potential parameters.

For example:

```shell
$ spm user register

$ spm module install apollo_onOff
```

are two valid spm commands to create and account and install a module in your code.

## User

This command is straight-forward :

* Register
```shell
$ spm user register
```
* Login
```shell
$ spm user login
```
* Logout
```shell
$ spm user logout
```
* Current logged user's details
```shell
$ spm user detail
```

## Module

Since projects and styleguides are still in development, this guide is describing our core feature : modules

Each module can contain:
* one or several stylesheets to affect the classes used in the DOM
* a script defining a javascript class
* high-level style or script variables used to customize the graphical behaviour of the component.

A module's full name is made up with the initial author's name and the intial module name, joined by a `_`. Classes and variables used to customize the module will originally always start with the module's full name.

You will find in a module distinct elements :
* `module-spm.json` file containing the module information, especially the entry file where all the code is imported
* `variables-spm.scss` file containing the module's main variables and especially the variable you can customize
* `spm_modules` folder, where all your project's modules are stored
* `spm_instances` folder, where two files are stored:
    - `spm_instances.js`: to list, select and customize all the modules' scripts you're using in your code
    - `spm_instances.scss`: to list, select and customize all the modules' stylesheets you're using in your code
* three *entry files* which are the entry point for your html, css and javascript code

Every time you use spm CLI commands, it locates spm scope by finding the closest module-spm.json file, in the current directory or its parents. You will be able to store modules inside each of your project or in your root as a global registry.

When installing spm, a registry is created as well. Global modules will be stored in it, classified by names, then by version.

Once you've found a module you like, you're ready to deploy it in your project !

### Installing modules with spm

Let's say you want to use the graphical element you've seen in module `apollo_onOff`. Open your terminal and navigate to your project, then use the `spm module install` or short `spm m i` CLI command.
```shell
$ spm m i apollo_onOff
```
At the end of the installation, the CLI displays the detail of what was installed, and WARNING / ERROR messages :
```shell
$ spm m i apollo_onOff

The following file has been installed :
apollo_onOff@2.0.1
  |_ apollo_input@1.0.1
     |
     |_ apollo_form-elem@1.2.7
```

By default, spm installer optimizes the quantity of information installed in your computer. If the requested version of your module already exists in your project or in you registry, no additional code will be written and a symbolic link will be created.

## Other features - implemented in next release

### Project

* To create a new project
```shell
$ spm project create <name> [options...]
```
* To publish a project
```shell
$ spm project publish <name> [options...]
```
* To modify project's local properties before publication
```shell
$ spm project edit <name> [options...]
```
* To modify project's permissions
```shell
$ spm project admin <name> [options...]
```
* To clean already published modules and import them as dependencies
```shell
$ spm project clean [options...]
```
* To modify the project's version
```shell
$ spm project version [enum('PATCH', 'MINOR', 'MAJOR')] [options...]
```
* To display project's details
```shell
$ spm project detail [options...]
```
* To list modules used in a project
```shell
$ spm project list [options...]
```

## Model - Styleguide

* To create a new styleguide
```shell
$ spm styleguide create [options...]
```
* To use an existing styleguide
```shell
$ spm styleguide import <name> [options...]
```
* To publish a styleguide
```shell
$ spm styleguide publish <name> [options...]
```
* To delete a styleguide
```shell
$ spm styleguide unpublish <name> [options...]
```

## cheatsheet

Generic model of one spm CLI command

```shell
$ spm <model> <action> [options...]
```

### modules

* Creation
```shell
$ spm module create [options...]
```
* Modification (properties before publication)
```shell
$ spm module edit [name] [options...]
```
* Modification (permissions)
```shell
$ spm module admin [name] [options...]
```
* Installations
```shell
$ spm module install <name> [options...]
```
* Generation (custom instances)
```shell
$ spm module generate <name> [options...]
```
* Publication
```shell
$ spm module publish [name>][options...]
```
* List
```shell
$ spm module list [options...]
```
* Search
```shell
$ spm module search [options...]
```
* Deletion
```shell
$ spm module unpublish <name[@version]> [options...]
```
* Cloning
```shell
$ spm module clone <name> [options...]
```
* Details (module-spm.json's content)
```shell
$ spm module detail [name] <options>
```
