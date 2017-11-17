# spm

## How does spm work ?

spm is powered by [scss](http://sass-lang.com/), the most famous css preprocessing language.

Each package contains one or several classes which modify DOM elements' attributes. It can contain high-level variables used to customize the graphical behaviour of the component.

A package's full name is made up with the initial author's name and the intial package name, joined by a `_`. Classes and variables used to customize the package will originally always start with the package's full name.

You will find in a package distinct elements :
* `package-spm.json` file containing the package information, especially the entry file where all the code is imported
* `variables-spm.scss` file containing the package's main variables and especially the variable you can customize
* `spm_modules` folder, where all your project's packages are stored

Every time you will use spm CLI commands, it will locate the spm project's scope by finding the closest package-spm.json file, in the current directory or its parents. You will be able to store packages inside each of your project or in your root as a global registry.

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
    [...],
    dependencies: {
        "apollo_onOff": '2.0.0'
    },
    [...]
}
```

Since spm doesn't download files already existing in your registry or project, you can force the re-installation by using option `--force` or `-f`.
```shell
$ spm i apollo_onOff -f
```

## Generating a customized package

After installing a package, you may want to customize it. For this purpose, you can use the `spm generate` or short `spm g` CLI command.
```shell
$ spm g apollo_onOff
```

## Using a package in your project

## Initializing your spm project

## Publishing your package

## spm commands cheat sheet