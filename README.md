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
* our Sandbox, a graphical interface allowing you to discover, experiment a constellation of graphical elements and their customizations and bundle them in downloadable bundles
* our CLI, made for fast and explicit commands

This github repository is our CLI code.

## How to install spm ?

Make sure you have node.js minimum version 6.4.0 and npm 3.10.3, then run

```shell
npm i spm-cli -g
```

the global option matters a lot since it will allow you to use the spm command to launch our CLI

## How does spm work ?

spm is powered by [scss](http://sass-lang.com/), the most popular css preprocessing language. But don't worry ! spm works very well with css natively (we still promote scss though :grin: )

Each package contains one or several classes which modify DOM elements' attributes. It can contain high-level variables used to customize the graphical behaviour of the component.

A package's full name is made up with the initial author's name and the intial package name, joined by a `_`. Classes and variables used to customize the package will originally always start with the package's full name.

You will find in a package distinct elements :
* `package-spm.json` file containing the package information, especially the entry file where all the code is imported
* `variables-spm.scss` file containing the package's main variables and especially the variable you can customize
* `spm_modules` folder, where all your project's packages are stored
* an *entry file* which is centralizing all other stylesheets with imports. 

Every time you use spm CLI commands, it locates the spm project's scope by finding the closest package-spm.json file, in the current directory or its parents. You will be able to store packages inside each of your project or in your root as a global registry.

Two additionnal files can be found in a project
* `style-guide.scss` file containing variables based on best practices about colors and dimensions
* `ref-dom.html` file used for publication based on a custom DOM

When installing spm, a registry is created as well. Global packages will be stored in it, classified by names, then by version.

Once you've found a package you like, you're ready to deploy it in your project !

## Installing packages with spm

Let's say you want to use the graphical element you've seen in package `apollo_onOff`. Open your terminal and navigate to your project, then use the `spm install` or short `spm i` CLI command.
```shell
$ spm i apollo_onOff
```
At the end of the installation, the CLI displays the detail of what was installed, and WARNING / ERROR messages :
```shell
$ spm i apollo_onOff

The following file has been installed :
apollo_onOff@2.0.1
  |_ apollo_input@1.0.1 .......... blue-input
     |
     |_ apollo_form-elem@1.2.7
```
By default, spm installer optimizes the quantity of information installed in your computer. If the requested version of your package already exists in your project or in you registry, no additional code will be written and a symbolic link will be created.

## Pattern

```shell
$ spm <model> <action> [options...]
```

## Model - Project

* Créer nouveau projet
```shell
$ spm project create <name> [options...]
```
=> génère automatiquement un styleguide sauf si option --no-styleguide ?

creates styleguide.scss + environment.js files
creates index.html

* Publier un nouveau projet
```shell
$ spm project publish <name> [options...]
```
* Modifier des propriétés locales du projet avant publication
```shell
$ spm project edit <name> [options...]
```
* Modifier des permissions sur le projet
```shell
$ spm project admin <name> [options...]
```
* Importer un module dans le projet
```shell
$ spm project use <moduleName> [options...]
```
=> dans project ou dans module ?

* cleaner les modules déjà publiés en les important en tant que dépendances
```shell
$ spm project clean [options...]
```
* modifier la version du projet
```shell
$ spm project version [enum('PATCH', 'MINOR', 'MAJOR')] [options...]
```
* Détail d'un projet
```shell
$ spm project detail [options...]
```
* Liste des modules utilisés dans un projet
```shell
$ spm project list [options...]
```

## Model - Styleguide

* Créer nouveau styleguide
```shell
$ spm styleguide create [options...]
```

* Utiliser un styleguide existant
```shell
$ spm styleguide import <name> [options...]
```
=> import au lieu d'install ? sachant que c'est un pur import pour le coup

* Publier un styleguide
```shell
$ spm styleguide publish <name> [options...]
```
* Supprimer un styleguide
```shell
$spm styleguide unpublish <name> [options...]
```
=> pas de version pour un styleguide

## Model - Module

* Créer nouveau module dans un répertoire
```shell
$ spm module create [options...]
```
=> options du init original + --flat + --no-css + --no-js + --no-file

creates variables-spm.css + const-spm.js for instance variables
name.[extension]
creates style.scss, script.js & index.html + balises
links variables-spm.scss to project styleguide if found
no index.html if project found

* Modifier les propriétés locales du module avant publication
```shell
$ spm module edit [name] [options...]
```
* Modifier les permissions sur le projet
```shell
$ spm module admin [name] [options...]
```
* Installer un module
```shell
$ spm module install <name> [options...]
```
* Générer une instance d'un module
```shell
$ spm module generate <name> [options...]
```
* Publier un module
```shell
$ spm module publish [name>][options...]
```
* Liste des modules utilisés dans un projet + dépendances
```shell
$ spm module list [options...]
```
* Recherche de modules publics et privés autorisés dans le registre
```shell
$ spm module search [options...]
```
* Supprimer une version d'un module ou un module entier
```shell
$ spm module unpublish <name[@version]> [options...]
```
* Récupérer le contenu source d'un module publié
```shell
$ spm module clone <name> [options...]
```
* Détails d'un module (package.json)
```shell
$ spm module detail [name] <options>
```
=> options pouvant être comme les selects dans mongo (--item1 --item2 pour seulement item1 et item2, --no-item3 --no-item4 pour tout sauf item3 et item4)

## Model - User

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
* Detail du current user
```shell
$ spm user detail
```
