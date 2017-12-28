Files required :

Command to be tested :

# spm init

00) option -n ou non -n
01) Nom par défaut == nom du repo
02) Version par défaut == 1.0.0 + refus d'un format non x.x.x
03) Default style : vérifier liste avec ['css', 'scss']
04) main class nom répertoire
05) vérifier que les classes entrées avec des ',' et ' '
06) entry point index.scss par défault + génération du fichier
07) author => par défault le nom dans preferences / anonymous
08) repo
09) readme => README.md par défaut
10) contributors entrés avec des ',' et ' '
11) keywords entrés avec des ',' et ' '
12) description
13) récapitulatif
14) présence des fichiers => ajout de l'import dans le entry, des variables dans variables, et des bonnes informations dans le package-spm.json

# spm use

commands
* spm u
* spm u package
* spm u package1 package2
* spm u -m module
* spm u -m unknowModule
* spm u alreadyImportedPackage
* spm u package -p relativePath
* spm u package -p absolutePath
* spm u package -p 'path1 path2'

# spm generate

## fix the use part => test use first

commands
* spm g
* spm g package
* spm g unknownPackage
* spm g package package
* spm g package nickname
* spm g package nickname
* spm g package nickname -u
* spm g package nickname -u unknownFiles
* spm g package nickname -u singleFile1
* spm g package nickname -u 'singleFile2 unknownFile'
* spm g package nickname -u 'singleFile1 singleFile3'
* spm g package -f
* spm g package -r
* spm g package nickname -r

+ verification files created with correct argument and path
