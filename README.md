<!-- [![Build Status](https://travis-ci.org/spm-style/cli.svg?branch=master)](https://travis-ci.org/spm-style/cli)
[![Coverage Status](https://coveralls.io/repos/github/spm-style/cli/badge.svg?branch=master)](https://coveralls.io/github/spm-style/cli?branch=master)
-->
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fspm-style%2Fcli.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fspm-style%2Fcli?ref=badge_shield)
[![NSP Status](https://nodesecurity.io/orgs/spm/projects/62af19a4-3d64-4da0-9c22-0255d20d7e57/badge)](https://nodesecurity.io/orgs/spm/projects/62af19a4-3d64-4da0-9c22-0255d20d7e57)
[![dependencies](https://david-dm.org/spm-style/cli.svg)](https://david-dm.org/spm-style/cli)
[![Known Vulnerabilities](https://snyk.io/test/github/spm-style/cli/badge.svg)](https://snyk.io/test/github/spm-style/cli)
[![documentation](https://inch-ci.org/github/spm-style/cli.svg)](https://inch-ci.org/github/spm-style/cli)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

# [spm](https://www.spm-style.com)

spm is a style package manager. It makes it easy to find inspiration, maintain and share multiple graphical components and show off what you're capable of.

You can browse among many elements based on their device compatibility, check for updates, and use the same code over and over without actually storing it, *FOR FREE*.

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

You can specify multiple arguments to install multiple packages.
```shell
$ spm i apollo_onOff apollo_form-elem@1.2.7

The following files have been installed :
apollo_onOff@2.0.1
  |_ apollo_input@1.0.1 .......... blue-input
     |
     |_ apollo_form-elem@1.2.7
apollo_form-elem@1.2.7

WARNING: apollo_form-elem@1.2.7 not installed - already existing
```

If no argument is specified, spm will install all project's dependencies.

However, you can precise that the package has to be installed locally with option `--local` or `-l`.
```shell
$ spm i apollo_onOff -l
```

You can do the same forcing the package to be installed in your own global registry, using option `--registry` or `-r`. Note that `sudo` command may be required.
```shell
$ sudo spm i apollo_onOff -r
```

To install all dependencies listed in a project's `package-spm.json`, just use `spm i` command without any argument.

If you want, you can precise the version of the package you want to install using `@` marker:
```shell
$ spm i apollo_onOff@1.0.1
```
If no version is precised, the Long Term Support (LTS) will be automatically selected.

If you want to save this package in your project so you can easily share its content, you can use option `--save` or `-s`.
```shell
$ spm i apollo_onOff -s
```
It will add the version of this package in `package-spm.json` file's dependencies key :
```json
{
    "dependencies": {
        "apollo_onOff": "2.0.0"
    },
}
```

Since spm doesn't download files already existing in your registry or project, you can force the re-installation by using option `--force` or `-f`.
```shell
$ spm i apollo_onOff -f
```

## Generating a customized package

After installing a package, you may want to customize it and generate a new package from it. For this purpose, you can use the `spm generate` or short `spm g` CLI command.
```shell
$ spm g apollo_onOff myNewPackage
```
Here, we are specifying the creation of a new instance of apollo_onOff package that we call myNewPackage. spm opens a prompt to ask for the value of all customizable variables :
```shell
$ spm g apollo_onOff myNewPackage
? value of adrien_onOff-offColor (red)
```
The default value of the variable is precised between parenthesis, so pressing the enter key will select the default value. 
```shell
$ spm g apollo_onOff myNewPackage
? value of adrien_onOff-offColor red
? value of adrien_onOff-onColor (blue) green
```
Once all the values have been defined, the customized instance of your package is created inside the `dist` folder located inside your package.

The classes are automatically renamed with a different prefix so you can use several instances of a package withint the same project. For instance, here:
* `apollo_onOff` class is renamed in `myNewPackage`,
* `apollo_onOff-radius` class is renamed in `myNewPackage-radius`,
* `apollo_onOff-pointer` class is renamed in `myNewPackage-pointer`.

If you would like to customize the names of each class, you can use the option `--rename` or `-r`.
```shell
$ spm g apollo_onOff myNewPackage

? value of apollo_onOff-offColor red
? value of apollo_onOff-onColor blue
? value of apollo_onOff-radius 10px
? instance name to replace apollo_onOff myNewPackage
? instance name to replace apollo_onOff-radius (myNewPackage) myNewRadius
[...]
```
One package cannot have two different customizations with the same name. For this reason, when trying to generating a customized package with an existing name, the CLI will exit with an error message. However, you can force this action with option `--force` or `-f`.
```shell
$ spm g apollo_onOff myNewPackage -f
```
**WARNING**: this action will replace the previous customized package, so its content will be lost. Use this option very carefully !

Each customizable variable is associated to one of the package's classes. If you want to generate a customized package affecting only one class' variables, you can target this class using option `--class` or `-c`.
```shell
$ spm g apollo_onOff myPackageBis -C apollo_onOff-radius

? value of apollo_onOff-radius (10px)
```
Since you probably want to use what you've generated, you can do it with the option `--use` or `-u`.
```shell
$spm g apollo_onOff myNewPackage -u ./styles/forms.scss
```
Note that you can use relative or absolute path as arguments.

If you don't add any argument after `-u`, the import will automatically be added in your entry style file. If you don't have any, spm will generate a complete overview of your stylesheets starting at your project's level as a selectable checkbox list.

Moreover, if you want to import your newly generated file inside several stylesheets, you can list them between quotes, separating them with `,` and/or ` `.

On the top of that, spm embeds a command dedicated to importing spm packages, detailed in the following section.

## Using a package in your project

Now you're able to install and customize spm packages, you may want to use the generated content in your project. For this purpose, you can use the `spm use` or short `spm u` CLI command.
```shell
$ spm u apollo_onOff

SUCCESS: The following instance has been added:
> apollo_onOff of module apollo_onOff
in file
> index.scss
```
It immediately adds the following line in the entry stylesheet you've chosen for your project:
```css
@import './spm_modules/apollo_onOff/dist/apollo_onOff.scss';
```
If no entry stylesheet is found, spm will generate a complete overview of your stylesheets starting at your project's level as a selectable checkbox list.

If you want to target one or several other stylesheets, you can use the option `--path` or `-p`.
```shell
$ spm u apollo_onOff -p './styles/inputs.scss /Users/myName/Documents/my-project/main.scss'
```
Note that if you have multiple arguments after path you should always place them between quotes (single or double) and separated by `,` or ` `.

This command identifies a package by its name. Since spm allows to customize a package and rename it, it is possible to have multiple packages containing the same instance name. spm will then open a prompt to make you chose the correct one, by displaying the original package name.
```shell
$ spm u myNewPackage


```
You can as well use the option `--module` or `-m` if you already know in which module you want to import the package from.
```shell
$ spm u myNewPackage -m apollo_onOff
```

## Initializing your spm project

Initializing your project adds a `package-spm.json` file at the level where you enter the command `spm init` CLI command. It opens a prompter asking for the project's main parameters :
```shell
$ spm init

? module name myProject
? version: 1.0.0
? default style: scss
? type: native
? main class in your module myProject
? other classes in your module
? entry point: index.scss
? scss variables:
? author: anonymous
? repository:
? readme: README.md
? contributors:
? license: IST
? keywords:
? description:
About to write to /Users/username/Desktop/myProject/package-spm.json
{
  "name": "myProject",
  "version": "1.0.0",
  "style": "scss",
  "main": "myProject",
  "scripts": {
    "test": "echo \"Error = no test specified\" && exit 1"
  },
  "author": "anonymous",
  "license": "IST",
  "keywords": [],
  "description": "",
  "dependencies": {},
  "type": "native",
  "classes": [],
  "entry": "index.scss",
  "variables": [],
  "repository": "",
  "readme": "README.md",
  "contributors": []
}
? Is this ok ? (Y/n)
```
There are two main reasons to run this command before using any other spm feature:
* Most of the features described above require an entry file to run more smoothly.
* You cannot publish a project which has not been initialized. Which means you cannot use spm to share, demonstrate or version your code.

Therefore, we strongly encourage you to run this command everytime you start a project.

## Publishing your package

**IMPORTANT** Before publishing a package, you must have a spm profile.

Once your code is ready, you can publish your package using the `spm publish` or short `spm p` CLI command.
```shell
$ spm p myAwesomePackage
```

In order to publish your package, spm requires mandatory information to be present in your `package-spm.json` file:
* style 
* type 
* version 
* description 
* author 
* entry 
* scripts 
* license 
* repository 
* readme 
* keywords 
* main 
* category 
* classes 
* responsiveness 

Moreover, you need to have a `ref-dom.html` template file if you don't use one of spm templates.

There are several checks done on CLI side, more checks are done by spm registry to ensure the quality of the package.

Wether the publication suceeds or not, a report will be displayed in your terminal.

To ensure each package's unicity and the compatibility between all packages, spm renames all publications based on this model : *author*\_*name*. The classes and variables will be renamed the same way.

Once your publication is validated, it will be accessible by:
* anyone if it is a public publication
* specific collaborators you've chosen if it is a private publication

The access to a publication includes :
* access to its overview in our website
* right to install the module in your project

Moreover, specific contributors of your choice will be able to update your code and publish a new version.

## spm lexicon

| name | description |
|---|---|
| style | css, or a pre-processing language (scss) |
| type | only one potential value : 'native' |
| entry | the stylesheet file centralizing a project's style |
| main | your project's main class |
| keywords | single words used to find your publication faster on spm website |
| category | classify your project for spm search engine with a single word |
| responsiveness | a list of devices types your project is compatible with |

## spm commands cheat sheet

- installing spm



- creating a user
    + 
- initializing a spm project
    + spm init
- installing a spm package
    + spm install [package...] : optimizes the installation between your local project and your global
    + spm install [package@version] : installs a package's targeted version
    + spm install [package...] -l : makes the install locally
    + spm install [package...] -r : makes the install in your global registry, accessible by other projects
    + spm install [package...] -s : installs a list of packages and adds them as dependencies of your project
    + spm install [package...] -f : installs a package and its dependencies even if they are already installed
- generating a customized instance
    + spm generate [package] [newName] : creates a new instance of a package called newName
    + spm generate [package] [newName] -r : allows to customize each class of the customized package
    + spm generate [package] [newName] -C [class] : generates a new instance of a package modifying only the parameters associated to a class
    + spm generate [package] [newName] -u : the customized package is generated and imported in the project's entry file
    + spm generate [package] [newName] -u '[pathes...]' : the generated instance is imported in the files accessible with the relative or absolute pathes
    + spm generate [package] [newName] -f : forces the generation of the instance even if it already exists for the package
- using an instance in your project
    + spm use [instance] : Imports an instance (customized or not) in the project's entry file
    + spm use [instance] -p [pathes...] : imports an instance in multiple files
    + spm use [instance] -m [package] : imports an instance from a specific package
- publishing your project
    + spm publish [projectName] : sends a request to spm registry to publish a project as a package
- accessing to a package's documentation
    + spm docs [package] : displays the package's README.md
