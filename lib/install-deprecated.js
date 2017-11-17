/******************************************************************************/
/*  NAME FILE : install.js
/*  DESCRIPTION : Prompt and function for install any spm module in local or
/*                global
/*
/*  DEPENDENCIES:
/*    - Inquirer ( node )
/*    - Chalk ( node )
/*    - Fs ( node )
/*    - Api ( lib/api )
/*    - Common ( lib/common )
/*    - Install ( lib/models.Install )
/*    - Dependency ( lib/models.Dependency )
/*    - CONST ( lib/const )
/*
/*  PROBLEM
/*    - si deux foix le meme module et la meme ou differente version
/*    - ? --prod
/*    - > registery prive
/*    -
/*    -
/*    -
/*    -
/******************************************************************************/

/********** DEPENDENCIES NODE **********/
let Inquirer = require('inquirer');
let Chalk = require('chalk');
let Fs = require('fs');

let request = require('request');
let Targz = require('tar.gz');

/********** DEPENDENCIES LIB **********/
let Api = require('./api');
let Common = require('./common');
let Install = require('./models').Install;
let Dependency = require('./models').Dependency;
let CONST = require('./const');

/********** VARIABLE **********/
const DisplayFuncName = false;
let countRecursive = 0;

/********** FUNCTION **********/
let debugPromise = (install) => {
  return new Promise((resolve, reject) => {
    if(DisplayFuncName) console.log('funct° - debugPromise');
    console.log('****************** DEBUG INSTALL ******************\n', install);
    console.log('****************** DEBUG ARBO ******************\n', install.arborescence);
    return resolve(install);
  });
}

let displayMessagesPromise = (install) =>{
	if(DisplayFuncName) console.log('funct° - displayMessages');
	return new Promise((resolve, reject) => {
		for (let info of install.infoMessages){
			console.log(Chalk.hex(CONST.INFO_COLOR)(info.prefix ? info.prefix + ': ' + info.message: info.message));
		}
		for (let warning of install.warningMessages){
			console.log(Chalk.hex(CONST.WARNING_COLOR)(warning));
		}
		return resolve(install);
	});
}

let isSudoForGlobalPromise = (install) => {
  if(DisplayFuncName) console.log('funct° - isSudoForGlobalPromise');
  return new Promise((resolve, reject) => {
    if(!install.isGlobal && !install.isRegistery){
       resolve(install);
    }else{
      Fs.writeFile(`${CONST.SPM_PATH}/test.txt`, (err, data) => {
        if(err){
          return reject(Chalk.hex(CONST.ERROR_COLOR)(CONST.ERROR.NO_SUDO_FOR_GLOBAL));
        }else{
          Fs.unlink(`${CONST.SPM_PATH}/test.txt`, (err) => {
            if(err){
              reject(err);
            }else{
              resolve(install);
            }
          });
        }
      });
    }
  });
}

let findPackageSpmPromise = (install) => {
  if(DisplayFuncName) console.log('funct° - findPackageSpmPromise');
  return new Promise((resolve, reject) => {
    let currentDirectory = Common.getCurrentPath();
    if (currentDirectory.indexOf(CONST.USER_DIRECTORY) == -1){
			return reject(Chalk.hex(CONST.ERROR_COLOR)(CONST.ERROR.OUT_OF_SCOPE));
		}
    while (currentDirectory != CONST.USER_DIRECTORY){
			if (Fs.existsSync(currentDirectory + '/package-spm.json')){
				install.pathPackage = currentDirectory + '/package-spm.json';
        install.pathProject = currentDirectory;
				return resolve(install);
			}
			currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'));
		}
    if (install.names.length > 0){
			install.addMessage('warning', CONST.WARNING.NO_PACKAGE_SPM);
			return resolve(install);
		}else{
			return reject(Chalk.hex(CONST.ERROR_COLOR)(CONST.ERROR.NO_PACKAGE_SPM));
		}
  });
}

let createModuleDirectoryPromise = (install) => {
	if(DisplayFuncName) console.log('funct° - createModuleDirectory');
	return new Promise((resolve, reject) => {
    if(!Fs.existsSync(CONST.REGISTERY_PATH)){
      Fs.mkdirSync(CONST.REGISTERY_PATH);
    }else if(!Fs.existsSync(CONST.GLOBAL_PATH)){
      Fs.mkdirSync(CONST.GLOBAL_PATH);
    }
    install.pathRegistery = CONST.REGISTERY_PATH;
    install.pathGlobal = CONST.GLOBAL_PATH;
    if(install.isRegistery){
      install.pathModules = install.pathRegistery;
    }else if(install.isGlobal){
      install.pathModules = install.isGlobal;
    }else{
      let currentDirectory = Common.getCurrentPath();
      if(install.pathPackage){
        install.pathModules = `${install.pathProject}/spm_modules`;
      }else{
        let limit = install.pathPackage ? install.pathProject : CONST.USER_DIRECTORY;
        while (!Fs.existsSync(`${currentDirectory}/spm_modules`) && currentDirectory != limit){
          currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'));
        }
        if(Fs.existsSync(`${currentDirectory}/spm_modules`)){
          install.addMessage('warning', `install dans le dossier: ${currentDirectory}/spm_modules`);
          install.pathModules = `${currentDirectory}/spm_modules`;
        }else{
          install.addMessage('warning', CONST.WARNING.NO_SPM_MODULES);
          install.pathModules = `${Common.getCurrentPath()}/spm_modules`;
        }
      }
    }
    resolve(install);
	});
}

let getDependenciesInstall = (install) => {
  if(DisplayFuncName) console.log('funct° - getDependenciesInstall');
  return new Promise((resolve, reject) => {
    if(install.pathPackage){
      Common.getPackageSpmFilePromise(install.pathPackage)
      .then(json => {
        if(!json){
          reject(Chalk.hex(CONST.ERROR_COLOR)(CONST.ERROR.SPM_PACKAGE_NOT_FOUND));
        }else{
          if(install.names.length == 0){
            install.jsonContent = json;
            resolve(install);
          }else{
            install.jsonContent = json;
            install.addDependenciesNames(install.names);
            resolve(install);
          }
        }
      });
    }else{
      if(install.names.length == 0){
        reject(Chalk.hex(CONST.ERROR_COLOR)('if you want install add name of module or list in package-spm'));
      }else{
        install.addDependenciesNames(install.names);
        return resolve(install);
      }
    }
  });
}

let downloadListRecursiveWithDependencyPromise = (dependency, callback, obj, key) => {
  if(DisplayFuncName) console.log('funct° - downloadListRecursiveWithDependencyPromise');
  return new Promise((resolve, reject) => {
    callback(dependency)
    .then(res => {
      obj[key] = res;
      return resolve(res);
    });
  })
}

let loopOfPromise = (list, data, index, callback, obj) => {
  if(DisplayFuncName) console.log('funct° - loopOfPromise');
  return new Promise((resolve, reject) => {
    if(index < list.length){
      Api.getJsonApiPromise(list[index], data.dependencies[list[index]])
      .then(json => downloadListRecursiveWithDependencyPromise(new Dependency(json, data, list[index], data.dependencies[list[index]]), callback, obj, list[index]))
      .then(() => loopOfPromise(list, data, index + 1,  callback, obj))
      .then(() => { return resolve(obj) })
      .catch(console.log);
    }else{
      return resolve(null)
    }
  });
}

let downloadModulePromise = (name, version, action, oldVersion=null, targetPath=null, symlinkSrc=null) => {
  if(DisplayFuncName) console.log('funct° - downloadModulePromise');
  return new Promise((resolve, reject) => {
    // console.log('**************************** downloadModulePromise ********\n', name, version, action, oldVersion, targetPath, symlinkSrc);
    if(symlinkSrc){
      Fs.symlink(symlinkSrc, targetPath, (err, data) => {
        if(err){
          return resolve({name: name, version: version, status: 'error'});
        }else{
          return resolve({name: name, version: version, status: 'success'});
        }
      });
    }else{

      console.log(name, version, targetPath);
      let url = `http://localhost:3200/modules/${name}/${version}`;

      let rootPath = null;
      let parse = Targz().createParseStream();

      parse.on('entry', function(entry){
          if (!rootPath){
              rootPath = entry.path
          }

          if (entry.type == 'File'){
              let writable = Fs.createWriteStream(`${targetPath || Common.getCurrentPath()}/${entry.path.substring(rootPath.length)}`);
              entry.on('data', (chunk) => {
                  writable.write(chunk);
              });
          }else if (entry.type == 'Directory'){
              if (!Fs.existsSync(`${targetPath || Common.getCurrentPath()}/${entry.path.substring(rootPath.length)}`)){
                  Fs.mkdirSync(`${targetPath || Common.getCurrentPath()}/${entry.path.substring(rootPath.length)}`);
              }
          }

          entry.on('end', () => {
              if (!entry.path.startsWith(`${rootPath}node_modules`)){
                  // console.log('copying', entry.path);
                  entry.on('end', () => {
                      if (entry.type == 'Directory'){
                      }else{
                          writable.end();
                      }
                  });
              }
          })
      });

      parse.on("end", () => {
        return resolve({name: name, version: version, status: 'success'});
      });

      parse.on('error', function (err) {
          return reject(err);
      });

      request.get(url)
      .pipe(parse);
    }
  });
}

let getParentInstallRecursive = (data) => {
  if(DisplayFuncName) console.log('funct° - getParentInstallRecursive');
  return new Promise((resolve, reject) => {
    if(data.parent == null){
      resolve(data);
    }else{
      getParentInstallRecursive(data.parent)
      .then(resolve)
    }
  });
}

let addToDownloadListPromise = (dependency, levelRecursive) => {
  if(DisplayFuncName) console.log('funct° - addToDownloadListPromise');
  return new Promise((resolve, reject) => {
    console.log(dependency);
    if(levelRecursive == 0){
      // Si le level est de 0 alors on travail sur l'objet install alors on passe a la suite de la recursive
      return resolve(dependency);
    }else if(levelRecursive > 0){
      // Si le level est supperieur a 0 alors on travail soit sur un module ou une dependence
      return getParentInstallRecursive(dependency)
      .then(install => {
        // On recupere l'objet install
        if(!dependency.parent.isLink && !dependency.parent.alreadyInstall){
          // Si le parent n'est pas un lien
/***************** REGISTERY **************************************************/
          if(install.isRegistery){
            // Si on utilise l'obtion registry, on veut installer le module dans le registre local
            if(levelRecursive == 1){
              // L'objet dependence est un module
              dependency.setPathDependency(`${dependency.pathDependency}/${dependency.version}`);
              // Ajoute la version au pathdependency
              if(Fs.existsSync(dependency.getPathDependency())){
                // Si le dossier du module et le dossier de la version existe deja
                return Common.getPackageSpmFilePromise(dependency.getPathPackage())
                .then(json => {
                  // On recupere le package-spm du module installé
                  if(!json){
                    // Si le module ne contient pas de package-spm
                    install.warningMessages.push(`Module ${dependency.name}@${dependency.version} replace in local registry because missing package-spm`);
                    // Add message warningMessages
                    Common.deleteContentFolderRecursive(dependency.getPathDependency(), () => {
                      // On supprime le contenu du dossier version du module
                      Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                      // Ecriture du package-spm dans le dossier
                      install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'replace', null, dependency.getPathDependency()));
                      // Add to array of download
                      resolve(dependency);
                    })
                  }else{
                    // Si le module contient un package-spm
                    if(install.isForce){
                      // On utilise l'obtion force
                      install.warningMessages.push(`Module ${dependency.name}@${dependency.version} is replace with option force`);
                      // Add message warningMessages
                      Common.deleteContentFolderRecursive(dependency.getPathDependency(), () => {
                        // On supprime le contenu du dossier version du module
                        Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                        // Ecriture du package-spm dans le dossier
                        install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'replace', null, dependency.getPathDependency()));
                        // Add to array of download
                        resolve(dependency);
                      });
                    }else{
                      // On n'utilise pas l'obtion force
                      install.warningMessages.push(`Module ${dependency.name}@${dependency.version} allready install in local registery. If you want to reinstall use option force --force -f`);
                      // Add message warningMessages
                      resolve(dependency);
                    }
                  }
                });
              }else{
                console.log('DEBUG: ', dependency);
                // Si le dossier du module et le dossier de la version n'existe pas
                Fs.mkdir(`${dependency.getPathParentModule()}/${dependency.name}`, (err, data) => {
                  // Creer le dossier du module
                  Fs.mkdir(dependency.getPathDependency(), (err, data) => {
                    // Creer le dossier version du module
                    Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                    // Ecriture du package-spm dans le dossier
                    install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'add', null, dependency.getPathDependency()));
                    // Add to array of download
                    resolve(dependency);
                  })
                })
              }
            }else{
              // L'objet dependence est une dependence d'un module
              console.log(dependency);
              Fs.mkdir(dependency.parent.getPathModule(), (err, data) => {
                // Creer le spm-module dans le parent
                Fs.mkdir(dependency.getPathDependency(), (err, data) => {
                  // Creer le dossier de la dependence
                  Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                  // Ecriture du package-spm dans le dossier
                  install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'dependency', null, dependency.getPathDependency()));
                  // Add to array of download
                  resolve(dependency);
                });
              });
            }
          }else{
/***************** PAS DANS LE REGISTERY **************************************/
            // Si on veut installer le module dans le projet
            if(install.isLocal){
/***************** LOCAL ******************************************************/
              // On veut installer le module obliogatoirement en local et ces dependences dans son spm-modules
              if(Fs.existsSync(dependency.getPathDependency())){
                // Si le module est deja installer
                return Common.getPackageSpmFilePromise(dependency.getPathPackage())
                .then(json => {
                  // On recupere le package-spm du module installé
                  if(!json){
                    // Le module installé ne contient pas de package-spm.json valid
                    install.warningMessages.push(`Module ${dependency.name}@${dependency.version} replace because missing package-spm`);
                    // Add message warningMessages
                    Fs.lstat(dependency.getPathDependency(), (err, stats) => {
                      // Recupere des infos sur le modules deja installé
                      if(stats.isSymbolicLink()){
                        // C'est un lien
                        Fs.unlinkSync(dependency.getPathDependency());
                        // On supprime le lien
                        Fs.mkdir(dependency.getPathParentModule(), (err, data) => {
                          // Creer le dossier spm-modules du parent
                          Fs.mkdir(dependency.getPathDependency(), (err, data) => {
                            // Creer le dossier du module ou dependence
                            Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                            // Ecriture du package-spm dans le dossier
                            install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'add', null, dependency.getPathDependency()));
                            // Add to array of download
                            resolve(dependency);
                          });
                        });
                      }else{
                        // Si c'est pas un link
                        Common.deleteContentFolderRecursive(dependency.getPathDependency(), () => {
                          // On supprime le contenu du dossier du module
                          Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                          // Ecriture du package-spm dans le dossier
                          install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'add', null, dependency.getPathDependency()));
                          // Add to array of download
                          resolve(dependency);
                        });
                      }
                    });
                  }else{
                    // Le module installé contient un package-spm.json valid
                    Fs.lstat(dependency.getPathDependency(), (err, stats) => {
                      // Recupere des infos sur le modules deja installé
                      if(stats.isSymbolicLink()){
                        // C'est un lien
                        install.warningMessages.push(`Module ${dependency.name}@${dependency.version} replace because is a link`);
                        // Add message warningMessages
                        Fs.unlinkSync(dependency.getPathDependency());
                        // On supprime le lien
                        Fs.mkdir(dependency.getPathParentModule(), (err, data) => {
                          // Creer le dossier spm-modules du parent
                          Fs.mkdir(dependency.getPathDependency(), (err, data) => {
                            // Creer le dossier du module
                            Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                            // Ecriture du package-spm dans le dossier
                            install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'replace', null, dependency.getPathDependency()));
                            // Add to array of download
                            resolve(dependency);
                          });
                        });
                      }else if(json.version != dependency.version){
                        // Ils n'ont pas la meme version
                        install.warningMessages.push(`Module ${dependency.name}@${dependency.version} replace because is not the same version`);
                        // Add message warningMessages
                        Common.deleteContentFolderRecursive(dependency.getPathDependency(), () => {
                          // On supprime le contenu du dossier du module
                          Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                          // Ecriture du package-spm dans le dossier
                          install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'replace', json.version, dependency.getPathDependency()));
                          // Add to array of download
                          resolve(dependency);
                        });
                      }else{
                        // Ils ont la meme cersion est c'est pas un lien
                        if(install.isForce){
                          // On utilise l'option force
                          install.warningMessages.push(`Module ${dependency.name}@${dependency.version} replace because you use -f --force`);
                          // Add message warningMessages
                          Common.deleteContentFolderRecursive(dependency.getPathDependency(), () => {
                            // On supprime le contenu du dossier du module
                            Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                            // Ecriture du package-spm dans le dossier
                            install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'replace', json.version, dependency.getPathDependency()));
                            // Add to array of download
                            resolve(dependency);
                          });
                        }else{
                          // On utilise pas l'option force
                          install.infoMessages.push({message: `Module ${dependency.name}@${dependency.version} allready exist, if you want reinstall use -f --force`});
                          // Add message warningMessages
                          resolve(dependency);
                        }
                      }
                    });
                  }
                });
              }else{
                // Si le module n'est pas encore installer
                Fs.mkdir(dependency.getPathParentModule(), (err, data) => {
                  // Creer le dossier spm-modules du parent
                  Fs.mkdir(dependency.getPathDependency(), (err, data) => {
                    // Creer le dossier du module
                    Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
                    // Ecriture du package-spm dans le dossier
                    install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'add', null, dependency.getPathDependency()));
                    // Add to array of download
                    resolve(dependency);
                  });
                });
              }
            }else{
/***************** SPM_MODULES PROJET *****************************************/
              // On autorise les liens symboliques dans l'installation des modules ou dependences
              if(Fs.existsSync(`${install.pathModules}/${dependency.name}`)){
                // Le module existe deja dans le spm_modules du projet

              }else{
                // Le module n'existe pas encore
                if(install.projectDependencies[dependency.name]){
                  // Le module est dans la liste du package
                  if(levelRecursive == 1){
                    // On install un module
                    if(install.projectDependencies[dependency.name] == dependency.version){
                      console.log(`install local ${dependency.name}`);
                      resolve(dependency);
                    }else{
                      console.log(`Vous avez deja ce module dans votre `);
                    }
                  }
                }else{
                  // Le module n'est pas dans la liste du package

                }
              }



              // if(Fs.existsSync(`${install.pathModules}/${dependency.name}`)){
              //   // Le module existe deja dans le spm_modules du projet
              //   if(levelRecursive > 1){
              //     // On install une dependence
              //     Fs.mkdir(dependency.getPathParentModule(), (err, data) => {
              //       // Creer le dossier dans le parent
              //       Fs.mkdir(dependency.getPathDependency(), (err, data) => {
              //         // Creer le dossier du module
              //         Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
              //         // Ecriture du package-spm dans le dossier
              //         install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'dependency', null, dependency.getPathDependency()));
              //         // Add to array of download
              //         resolve(dependency);
              //       });
              //     });
              //   }
              //
              // }else{
              //   // Le module n'existe pas encore
              //   if(Fs.existsSync(`${install.pathRegistery}/${dependency.name}/${dependency.version}`)){
              //     // Le module existe avec la version dans le registery
              //
              //
              //   }else{
              //     // Le module n'existe pas dans le registery
              //     if(install.projectDependencies[dependency.name]){
              //       // Il existe un module avec ce nom dans le package spm
              //
              //     }else{
              //       // Il n'existe pas de module avec ce nom dans le package spm
              //       Fs.mkdir(install.pathModules, (err, data) => {
              //         // Creer le dossier spm_modules du parent
              //         let targetPathDependency;
              //         console.log(dependency);
              //         if(levelRecursive > 1){
              //           targetPathDependency = dependency.getPathDependency();
              //           // Stock le path pour le lien dans le parent
              //           dependency.setPathDependency(`${install.pathModules}/${dependency.name}`);
              //           // Donne le nouveau path
              //         }
              //         Fs.mkdir(dependency.getPathDependency(), (err, data) => {
              //           // Creer le dossier du module
              //           Fs.writeFileSync(dependency.getPathPackage(), `${JSON.stringify(dependency.jsonContent, null, "  ")}\n`);
              //           // Ecriture du package-spm dans le dossier
              //           install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'add', null, dependency.getPathDependency()));
              //           // Add to array of download
              //           if(levelRecursive > 1){
              //             // On install une dependence
              //             Fs.mkdir(dependency.getPathParentModule(), (err, data) => {
              //               // Creer le dossier dans le parent
              //               install.downloadList.push(downloadModulePromise(dependency.name, dependency.version, 'dependency', null, targetPathDependency ,dependency.getPathDependency()));
              //               // Add to array of download
              //               resolve(dependency);
              //             });
              //           }else{
              //             // On install un module
              //             resolve(dependency);
              //           }
              //         });
              //       });
              //     }
              //   }
              // }
            }
          }
        }else{
          if(dependency.parent.islink){
            // Si le parent est un lien vers un module alors on est sur une dependence et le module cible a deja tous les lien vers les modules necessaire
            dependency.setLink();
            // Set islink to true
          }else{
            // Si le module est deja installer
            dependency.setAlreadyInstall();
            // Set setAlreadyInstall to true
          }
          resolve(dependency);
        }
      });
    }else{
      // error levelRecursive < 0
      resolve(dependency);
    }
  });
}

let downloadListRecursivePromise = (data) => {
  if(DisplayFuncName) console.log('funct° - downloadListRecursivePromise');
  return new Promise((resolve, reject) => {
    addToDownloadListPromise(data, countRecursive)
    .then(() => {
      if(data == null || data.dependencies == null){ return resolve(null) }
      countRecursive++;
      return loopOfPromise(Object.keys(data.dependencies), data, 0, downloadListRecursivePromise, {} ) // 1 6
      .then(res => {
        countRecursive--;
        if(!countRecursive){
          data.arborescence = res;
          return resolve(data)
        }
        return resolve(res)
      });
    });

  });
}

let testPromiseAll = (install) => {
  if(DisplayFuncName) console.log('funct° - testPromiseAll');
  return new Promise((resolve, reject) => {
    return Promise.all(install.downloadList)
    .then(list => {
      console.log('**** END OF PROMISE ALL ****\n', list)
      return resolve(install);
    })
    .catch(reject);
  });
}

let printArborescencePromiseRecursive = (arborescence, dependencies, bases = [''], level = 0) => {
  let round = 1;
  for(let key of Object.keys(arborescence)){
    if(!level){
      console.log(Chalk.hex('#40E0D0')(`${key}@${dependencies[key]}`));
    }else{
      let display = '';
      for(let i = 0; i < bases.length; i++){
        display += bases[i];
      }
      console.log(Chalk.hex('#F6EAB7')(display + '  |_' ) + Chalk.hex('#C4B7D0')(key));
    }
    if(arborescence[key] != null){
      let newBase = bases.slice();
      let newLevel = level + 1;
      if(level){
        round < Object.keys(arborescence).length ? newBase.push('  |') : newBase.push('   ');
      }
      printArborescencePromiseRecursive(arborescence[key], null, newBase, newLevel);
    }
    round++;
  }
};

let printArborescencePromise = (install) => {
  if(DisplayFuncName) console.log('funct° - printArborescencePromise');
  return new Promise((resolve, reject) => {
    printArborescencePromiseRecursive(install.arborescence, install.dependencies);
    return resolve(install);
  });
}

/********** MAIN FUNCTION *****************************************************/


module.exports = (Program) => {
	Program
	.command('install')
	.alias('i')
	.description('installs the module or one of its components/templates/elements')
	.arguments('[names...]')
	.option("-g, --global", "futur exec project")
  .option("-l, --local", "to copy it in your local spm_modules")
  .option("-r, --registery", "to copy it in your /usr/lib/spm_modules")
	.option("-s, --save", "to add to dependencies in your local package.json")
	.option("-d, --dev", "to add to dev dependencies")
	.option("-p, --prod", "to only install dependencies")
	.option("-f, --force", "to force the install of all modules, including modules already installed")
  .option("--sudo", "user sudo")
	.action((names, options) => {
    let install = new Install(options, names);
    isSudoForGlobalPromise(install)
    .then(findPackageSpmPromise)
    .then(createModuleDirectoryPromise)
    .then(getDependenciesInstall)
    .then(downloadListRecursivePromise)
    //
    .then(testPromiseAll)
    // //
    .then(debugPromise)
    .then(displayMessagesPromise)
    // //
    .then(printArborescencePromise)

    .catch(console.log);

	}).on('--help', function() {
		console.log('  Examples:');
	});
}
