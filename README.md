### Use (spm use)

1) Le basique `spm use zorro`

- création répertoire dist/ dans spm_modules/zorro si inexistant
- création du fichier zorro.scss dans le dist/ avec le code suivant (écraser l'existant ?)
```scss
@import 'variables';
@import '../index';

.zorro {
    @extend %zorro;
}
```

2) La question du fichier qui utilise le style

Suggestions:
- Si rien de précisé, ajouter l'`@import`
    + soit dans le main du projet concerné
    + soit dans le seul fichier `.scss` du répertoire courant (si c'est le seul)
    + soit dans tous les fichiers `.scss` du répertoire courant
- Sinon forcer la précision avec `spm use zorro in ` + liste d'expression régulière
```shell
> spm use zorro in ../test.scss * ./logic/*
```
-> permettrait d'ajouter une balise `@import`:
- dans le fichier test.scss situé dans le répertoire parent
- dans tous les fichiers scss situés dans le répertoire courant
- dans tous les fichiers scss situés dans le répertoire logic/

3) `spm use zorro as test5`

- création répertoire dist/ dans spm_modules/zorro si inexistant
- création du fichier test5.scss dans le dist/ avec le code suivant
```scss
@import 'variables';
@import '../index';

.test5 {
    @extend %zorro;
}
```

4) L'instance: `spm use zorro as zorro_pink pink blue`

- création répertoire dist/ dans spm_modules/zorro si inexistant
- ajoute 2 variables dans le fichier `variables-spm.scss`
    + si balise `/*All variables above can be used in instances*/` absente, la créer à la fin du fichier de variables
    + ajouter les deux variables derrière avec un commentaire
```scss
$zorro-color: black;
$zorro-bgc: white;
/*All variables above can be used in instances*/
diverse variables
/*for zorro-pink instance of zorro*/
$zorro-pink-color: pink;
$zorro-pink-bgc: blue;
```
- met à jour le fichier `package-spm.json` avec en ajoutant dans l'objet instances (à créer si absent) l'objet suivant
```json
"instances": {
    "zorro": {
        "zorro-pink": {
            "zorro-color": 'zorro-pink-color',
            "zorro-bgc": 'zorro-pink-bgc' 
        },
        "val": {}
    }
}
```
- création du fichier `zorro-pink.scss` dans le dist/
```scss
@import '../variables-spm.scss';
@import '../../variables-spm.scss';
$local-zorro-color: $zorro-pink-color;
$local-zorro-bgc: $zorro-pink-bgc;
@import '../index';

.zorro-pink {
    @extend %zorro;
}
```
