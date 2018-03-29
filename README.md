# CLI v2.0

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
