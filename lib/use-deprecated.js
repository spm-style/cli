let Fs = require('fs');
let Path = require('path');

let Chalk = require('chalk');
let Inquirer = require('inquirer');

let Use = require('./models').Use;
let Common = require('./common');
let CONST = require('./const');

let list = (val) => { //probablemet à rajouter dans Common
	let res = [];
	let table = val.split(',');
	for (let i = 0; i < table.length; i++){
		table[i] = table[i].split(' ');
		for (let item of table[i]){
			if (item != ''){
				res.push(item);
			}
		}
	}
	return res;
}

let findPackagePromise = (use) => { //(-1)
	console.log('*** - ***');
  	return new Promise((resolve, reject) => {
	    if (use.path.indexOf(CONST.USER_DIRECTORY) == -1){
				return reject(CONST.ERROR.OUT_OF_SCOPE);
			}
	    while (use.path != CONST.USER_DIRECTORY){
			if (Fs.existsSync(use.path + '/package-spm.json')){
				use.pathPackage = use.path + '/package-spm.json';
				if (!Fs.existsSync(use.path + '/spm_modules')){
					return reject('please install a module before using it');
				}else{
					use.pathModules = use.path + '/spm_modules';
				}
				if (Fs.existsSync(use.path + '/variables-spm.scss')){
					use.pathVariables = use.path + '/variables-spm.scss';
				}else{
					Common.writeContent("\n\n//All variables above can be used in instances\n\n", 'variables-spm.scss');
					return reject('no variables-spm.scss file found - ')
				}
				return resolve(use);
			}
			use.path = use.path.substring(0, use.path.lastIndexOf('/'));
		}
		return reject(CONST.ERROR.OUT_OF_SCOPE);
 	});
}

let parsePackagePromise = (use) => { //(0)
	console.log('*** 0 ***')
  	return new Promise((resolve, reject) => {
	    let jsonFile = Common.parseJsonFileSync(use.pathPackage);
	    use.classes = {};
	    use.instances = {};
	    use.dependancies = jsonFile.dependancies || {};
	    use.main = jsonFile.main;
	    let flag = true;
	    if (use.nickname && jsonFile.instances && Object.keys(jsonFile.instances).length){
	    	for (let instance in jsonFile.instances){
	    		if (instance == use.nickname){
	    			flag = false;
	    			//checking that the use wants to use a instance already created
	    			Common.promptConfirmation(use, false, `${instance} from module ${instance.module} already used - replace it`)
	    			.then(res => {use.replace = true; return resolve(res); })
	    			.catch(err => {return reject(err); });
	    		}
	    	}
	    	if (flag){
	    		return resolve(use);
	    	}
  		}else{
	    	return resolve(use);
  		}
 	});
}

let findPotentialClassesPromise = (use) => { //(1aI)
	console.log('  - 1aI -');
	return new Promise((resolve, reject) => {
		Fs.readdir(use.pathModules, (err, files) => {
			//checker le comportement avec un lien symbolique
			for (let file of files){
				if (!use.module || use.module == file){
					if (Common.directoryExists(`${use.pathModules}/${file}`) &&
						Fs.existsSync(`${use.pathModules}/${file}/package-spm.json`)){
						let jsonFile = Common.parseJsonFileSync(`${use.pathModules}/${file}/package-spm.json`);
						for (let item of jsonFile.classes){
							use.classes[item] = file;
						}
						for (let instance in jsonFile.instances){
							use.classes[instance] = file;
						}
					}
				}
			}
			return resolve(use);
		});
	});
}

let selectClassfromModulePromise = (use) => { //(1a)
	console.log(' ++ 1a ++');
	return new Promise((resolve, reject) => {

		findPotentialClassesPromise(use) //(1aI)
		.then(res => {
			if (!Object.keys(use.classes).length){
				return reject(Chalk.hex(CONST.ERROR_COLOR)("There is no class available to be used"));
			}
			let questions = [{
				type: 'list',
				name: 'class',
				message: 'select the class you want to use',
				choices: Object.keys(res.classes),
				default: Object.keys(res.classes)[0]
			}];

			Inquirer.prompt(questions)
			.then(answer => {
				res.name = answer.class;
				res.class = answer.class;
				res.module = res.classes[answer.class];
				res.pathDist = `${use.pathModules}/${use.name}/dist`;
				res.pathModule = `${use.pathModules}/${use.name}`;
				return resolve(res);
			})
			.catch(err => {return reject(err);});
		})
		.catch(err => {return reject(err); });
	});
}

let selectClassOrInstancePromise = (use) => { //(1b)
	console.log(' ++ 1b ++');
	return new Promise((resolve, reject) => {
		Fs.readdir(use.pathModules, (err, files) => {
			for (let file of files){
				if (Common.directoryExists(`${use.pathModules}/${file}`) &&
					Fs.existsSync(`${use.pathModules}/${file}/package-spm.json`)){
					let jsonFile = Common.parseJsonFileSync(`${use.pathModules}/${file}/package-spm.json`);
					if (jsonFile.main){
						for (let item of jsonFile.classes){
							if (item == use.class && Fs.existsSync(`${use.pathModules}/${file}/${jsonFile.main}`)){
								use.module = file;
								use.pathModule = `${use.pathModules}/${file}`;
								use.pathClass = `${use.pathModules}/${file}/${jsonFile.main}`;
								use.pathDist = `${use.pathModules}/${file}/dist`;
								if (Fs.existsSync(`${use.pathModules}/${file}/variables-spm.scss`)){
									use.pathClassVariables = `${use.pathModules}/${file}/variables-spm.scss`;
								}
								return resolve(use);
							}
						}
					}
					for (let instance in jsonFile.instances){
						if (instance == use.class && Fs.existsSync(`${use.pathModules}/${file}/dist/${instance}.scss`)){
							use.module = file;
							use.pathModule = `${use.pathModules}/${file}`;
							use.pathClass = `${use.pathModules}/${file}/dist/${instance}.scss`;
							use.pathDist = `${use.pathModules}/${file}/dist`;
							if (Fs.existsSync(`${use.pathModules}/${file}/variables-spm.scss`)){
								use.pathClassVariables = `${use.pathModules}/${file}/variables-spm.scss`;
							}
							return resolve(use);
						}
					}
				}
			}
			return reject('the class you want to use is not installed in your project');
		});
	});
}

let findClassPromise = (use) => { //(1)
  	console.log('*** 1 ***');
  	return new Promise((resolve, reject) => {
		if (!use.name || (use.module && Fs.existsSync(`${use.pathModules}/${use.name}`) &&
			Common.directoryExists(`${use.pathModules}/${use.name}`))){
			//cas module ou aucun nom de précisé
			selectClassfromModulePromise(use) //(1a)
			.then(res => {return resolve(res);})
			.catch('error - ERROR');
		}else{
			//cas classe -> commence forcément avec auteur_module ou bien c'est une instance PEUT-ETRE PAS DRY
			selectClassOrInstancePromise(use) //(1b)
			.then(res => {return resolve(res); })
			.catch(err => {return reject(err);});
		}
 	});
}

let createDefaultVariables = (use) => { //(2a)
	console.log(' ** 2a **');
	return new Promise((resolve, reject) => {
		if (!use.pathClassVariables){
			return resolve({});
		}else{
			Fs.readFile(use.pathClassVariables, 'utf8', (err, data) => {
				if (err){
					return reject('issue reading the variables-spm.scss file');
				}else{
					let stopIndex = data.indexOf('//All variables above can be used in instances');
					let variableObject = {};
					let startIndex = 0;
					let i, j, k;

					while ((i = data.indexOf('$', startIndex)) >= 0 && (stopIndex < 0 || i < stopIndex)){
						if ((j = data.indexOf(':' , i)) >= 0 && (k = data.indexOf(';', i)) > j){
							let key = Common.removeWhitespaces(data.substring(i + 1, j));
							let value = Common.removeWhitespaces(data.substring(j + 1, k));
							variableObject[key] = value;
						}
						startIndex = i + 1;
					}
					use.variables = variableObject;
					return resolve(use);
				}
			});
		}
	});
}

let askInstanceVariablesPromise = (use) => { //(2b)
	console.log(' ** 2b **');
	return new Promise((resolve, reject) => {
		let questions = [];
		use.oldVariables = Object.assign({}, use.variables);
		for (let variable in use.variables){
			questions.push({
				name: variable,
				message: `value of ${variable}`,
				default: use.variables[variable]
				// validate: (value) => {
				// 	return Common.variableType(value) == Common.variableType(use.variables[variable]) ? true : Chalk.hex(CONST.WARNING_COLOR)('Please enter a value of type ' + Common.variableType(use.variables[variable]));
				// }
			});
		}

		Inquirer.prompt(questions)
		.then(answer => {
			for (let variable in use.variables){
				use.variables[variable] = Common.formatVariable(answer[variable]);
			}
			return resolve(use);
		})
	});
}

let checkDuplicateVariablesPromise = (data, use) => { //(2cI)
	console.log('  + 2cI +');
	return new Promise((resolve, reject) => {
		let i, j;
		if ((i = data.indexOf(`//${use.nickname} instance of ${use.class}`)) >= 0){
			if ((j = data.indexOf(`//end of instance ${use.nickname}`, i)) >= 0){
				let len = `//end of instance ${use.nickname}`.length;
				if (!use.replace){
					Common.promptConfirmation(null, false, `${use.nickname} from module ${use.module} already used - replace it`)
	    			.then(() => {return resolve(`${data.substring(0, i)}${data.substring(j + len)}`); })
	    			.catch(err => {return reject(err); });
				}else{
					return resolve(`${data.substring(0, i)}${data.substring(j + len)}`);
				}
			}else{
				return reject('current variables-spm.scss file is corrupted - intance is being duplicated');
			}
		}else{
			return resolve(data);
		}
		
	});
}

let updateVariablesFilePromise = (use) => { //(2c)
	console.log(' ** 2c **');
	return new Promise((resolve, reject) => {
		Fs.readFile(use.pathVariables, 'utf8', (err, data1) => {
			if (err){
				return reject('Error updating the variables-spm.scss');
			}
			checkDuplicateVariablesPromise(data1, use)
			.then(data => {
				use.dataVariablesForInstance = {};
				if (data.indexOf('//All variables above can be used in instances') < 0){
					data = `${data}\n//All variables above can be used in instances\n`;
				}
				let len = '//All variables above can be used in instances\n'.length;
				let insert = `//${use.nickname} instance of ${use.class}\n`;
				for (let variable in use.variables){
					if (!variable.startsWith(`${use.class}-`)){
						return reject('issue reading the variables-spm.scss file');
					}
					use.dataVariablesForInstance[variable] = `${use.nickname}-${variable.substring(use.class.length + 1)}`;
					insert = `${insert}$${use.nickname}-${variable.substring(use.class.length + 1)}: ${use.variables[variable]};\n`;
				}
				insert = `${insert}//end of instance ${use.nickname}\n`;
				data = data + insert;
				Fs.writeFile(use.pathVariables, data, err => {
					if (err){
						return reject('Error updating the variables-spm.scss');
					}
					return resolve(use);
				});
			})
			.catch(err => {return reject(err); });
		});
	});
}

let updateVariablesPromise = (use) => { //(2)
	console.log('*** 2 ***');
	return new Promise((resolve, reject) => {
		if (use.nickname){
			//a: trouver le fichier de variables et lister les valeurs
			createDefaultVariables(use)
			//b: demander quelles variables doivent être modifiées
			.then(askInstanceVariablesPromise)
			//c: effectuer les changements dans le fichier variables-spm.scss
			.then(updateVariablesFilePromise)
			.then(res => {return resolve(res); })
			.catch(err => {return reject(err); });
		}else{
			createDefaultVariables(use)
			.then(resolve)
			.catch(reject);
			// return resolve(use);
		}
	});
}

let importToFile = (subData) => {
	if (subData.length > 2){
		if (subData.startsWith("'") &&
			subData.split("'").length == 3 &&
			subData.split("'")[0] == ''){
			return subData.split("'")[1];
		}
		if (subData.startsWith('"') &&
			subData.split('"').length == 3 &&
			subData.split('"')[0] == ''){
			return subData.split('"')[1];
		}
		if (subData.startsWith('url(') && subData.indexOf(')') > 5){
			return importToFile(subData.substring(4, subData.indexOf(')')));
		}
	}
	return null;
}

recursiveMixinListPromise = (filePath, use) => {
	return new Promise((resolve, reject) => {
		Fs.readFile(filePath, 'utf8', (err, data) => {
			if (err){
				return reject(err);
			}
			let modules = [];
			let resultFile;
			let i, j, k;
			let indexStart = 0;

			while ((i = data.indexOf('@import ', indexStart)) >= 0){
				if ((j = data.indexOf(';', i)) >= 0){
					if (resultFile = importToFile(data.substring(i + 8, j))){
						if (resultFile.endsWith('.css')){
							data = data.substring(0, data.indexOf('.css', i)) + '.scss' + data.substring(data.indexOf('.css', i) + 4);
						}
						modules.push(resultFile.endsWith('.css') ? `${resultFile.slice(0, -4)}.scss` : resultFile);
					}
				}
				indexStart = i + 8;
			}
			let promises = [];
			for (let module of modules){
					promises.push(recursiveMixinListPromise(`${filePath.substring(0, filePath.lastIndexOf('/'))}/${module}`, use));
			}
			if ((i = data.indexOf('@mixin spm_')) >= 0 &&
				(j = data.indexOf('(', i)) >= 0 &&
				(k = data.indexOf(')', j)) >= 0){
				use.mixins.push(data.substring(i + 7, k + 1));
			}
			Promise.all(promises)
			.then(() => {return resolve(data); })
			.then(resolve)
			.catch(err => reject(Boom.badRequest(err.message, err)));
	
		});
	});
}

let listAllMixinsPromise = (use) => { //(3)
	console.log('*** 3 ***');
	return new Promise((resolve, reject) => {

		//à modifier de toute urgence car plus besoin de mixin :-)

		// use.mixins = [];
		// recursiveMixinListPromise(use.main, use)
		// .then(resolve)
		// .catch(reject);
		return resolve(use);
	});
}

let distCreationPromise = (use) => { //(4)
	console.log('*** 4 ***');
	return new Promise((resolve, reject) => {
		if (!Fs.existsSync(use.pathModule + '/dist')){
			Fs.mkdirSync(use.pathModule + '/dist');
		}
		return resolve(use);
	});
}

let checkInstancePathPromise = (use) => { //(5a)
	console.log(' ** 5a **');
	return new Promise((resolve, reject) => {
		use.pathInstance = `${use.pathDist}/${use.nickname || use.class}.scss`;
		if (!use.replace && Fs.existsSync(use.pathInstance)){
			Common.promptConfirmation(use, false, `${use.nickname || use.class} from module ${use.module} already used - replace it`)
	    			.then(() => {use.replace = true; return resolve(use); })
	    			.catch(err => {return reject(err); });
		}else{
			return resolve(use);
		}
	});
}

let changeMixinParameters = (mixin, use) => {
	//mixin vaut spm_Name($local-blabla,$local-blibli)
	let res = mixin.substring(0, mixin.indexOf('(' + 1));
	let table = mixin.substring(mixin.indexOf('(' + 1), mixin.indexOf(')')).split(',');
	//res vaut spm_Name(
	for (let i = 0; i < table.length; i++){
		if (table[i].startsWith('$local-')){
			res = `${res}${use.dataVariablesForInstance[table[i].substring(7)]}`;
		}
		if (i != table.length - 1){
			res = res + ', ';
		}
	}
	res = res + ')';
	return res;
}

let instanceCreatePromise = (use) => { //(5b)
	console.log(' ** 5b **', use.variables, Common.defineMixinName(use.main));
	return new Promise((resolve, reject) => {
		let data = `@import '${Path.relative(use.pathClass, use.path)}/variables-spm.scss';\n`;
		data = `${data}@import '../${use.main}';\n`;

		// for (let mixin of use.mixins){
		// 	data = `${data}@include ${changeMixinParameters(mixin, use)};\n`;
		// }
		data = `${data}\n\n@include spm_${Common.defineMixinName(use.main)}-${use.name}(`;
		//liste des paramètres utilisés
		for (let variable in use.variables){
			data = `${data}${use.variables[variable]},`;
		}
		data = `${data}'${use.nickname || use.name}');\n`;
		if (!use.dependency)
			data = `${data}.${use.nickname || use.name} {@extend %${use.nickname || use.name};}`
		//${use.nickname || use.name} {\n\t@extend %${use.class};
		Fs.writeFile(use.pathInstance, data, err => {
			if (err){
				return reject('Error writing the new instance');
			}
			return resolve(use);
		});
	});
}

let instanceCreationPromise = (use) => { //(5)
	return new Promise((resolve, reject) => {
		checkInstancePathPromise(use)
		.then(instanceCreatePromise)
		.then(res => {return resolve(res); })
		.catch(err => {return reject(err); });
	});
}

let updateUsedFiles = (use) => { //(6)
	console.log('*** 6 ***');
	return new Promise((resolve, reject) => {
		if (!use.used || !use.used.length){
			return resolve(use);
		}else{
			for (let item of use.used){
				//pour l'instant, pas d'expression régulière
				if (item.endsWith('.css') || item.endsWith('.scss')){
					let target = `${use.path}/${item}`;
					if (Fs.existsSync(target)){
						console.log('le fichier existe');
						Fs.readFile(target, 'utf8', (err, data) => {
							if (err){
								return reject(`issue reading the file ${target}`);
							}
							let startIndex = 0;
							let i;
							while ((i = data.indexOf('@import ', startIndex)) >= 0){
								startIndex = data.indexOf(';', i);
								if (startIndex < -1){
									console.log('pb de format import');
									data = null;
									break;
								}
							}
							if (!data){
								data = '';
							}
							if (!startIndex){
								//we use substring 1 because the file will never be a directory and it puts ../ anyway
								data = `@import '${Path.relative(target, use.pathInstance).substring(1)}';\n${data}`;
							}else{
								console.log('import found', Path.relative(target, use.pathInstance));
								data = `${data.substring(0, startIndex + 1)}\n@import '${Path.relative(target, use.pathInstance).substring(1)}';${data.substring(startIndex +1)}`;
							}
							Fs.writeFile(target, data, err => {
								if (err){
									console.log('error');
									//pas de message d'alerte pour cette commande, un warning p-e ?
								}
							});
						});
					}	
				}
			}
			return resolve(use);
		}
	});
}

let packageUpdatePromise = (use) => { //(7)
	console.log('*** 7 ***');
	return new Promise((resolve, reject) => {
		if (!use.nickname){
			console.log('final use', use);
			console.log(Chalk.hex(CONST.SUCCESS_COLOR)(`${use.dependency ? 'placeholder' : 'class'} ${use.nickname || use.name} has been added to ${use.used || 'your project'}`));
			return resolve(use);
		}else{
			let jsonFile = Common.parseJsonFileSync(use.pathPackage);
			if (!jsonFile.instances){
				jsonFile.instances = {};
			}
			jsonFile.instances[use.nickname] = {
				module: use.module,
				class: use.class,
				var: {}
			};
			for (let key in use.oldVariables){
				console.log('key:', key);
				if (!use.variables[key]){
					return reject('issue modifying the instance variables');
				}
				if (use.oldVariables[key] != use.variables[key]){
					jsonFile.instances[use.nickname].var[key] = use.variables[key];
				}
			}
			Common.writeContent(JSON.stringify(jsonFile, null, "  ") + '\n', 'package-spm.json')
			.then(() => {
				console.log('final use', use);
				console.log(Chalk.hex(CONST.SUCCESS_COLOR)(`${use.dependency ? 'placeholder' : 'class'} ${use.nickname || use.name} has been added to ${use.used || 'your project'}`));
				return resolve(use); })
			.catch(err => {return reject(err); });
		}
	});
}

module.exports = (Program) => {
	Program
	.command('use')
	.alias('u')
	.description('to use a style you have already installed')
	.arguments('[name] [nickname]')
	.option("-p, --path <files>", 'where the style will be imported', list)
	.option("-m, --module", 'to target a module and not a class')
	.option("-d, --dependency", 'to install the module as a placeholder dependency')
	.action((name, nickname, options) => {
		let use = new Use(name, nickname, options.path, options.module, options.dependency, Common.getCurrentPath());
	   //-1: find package, modules and variables
	   	findPackagePromise(use)
		//0: parsing information package, modules, variables, instances & classes
		.then(parsePackagePromise)
		//1: looking for the path to the used Module
		.then(findClassPromise)
		//2: if instance variables were specified, updates variables-spm.scss and prepare the object for package-spm.json update + used files
		.then(updateVariablesPromise)
		//3: go recursively in all files to save mixins called in the instance file
		.then(listAllMixinsPromise)
		//4: creates dist/ directory in it if not already present
		.then(distCreationPromise)
		//5: creates the file in the dist/ directory, can be original instance (zorro) or real instance (zorro-pink)
		.then(instanceCreationPromise)
		//6: if files where it is used were specified  (@import)
		.then(updateUsedFiles)
		//7: update the package-content
		.then(packageUpdatePromise)
		.catch(err => {console.log(Chalk.hex(CONST.ERROR_COLOR)(err))});
	})
	.on('--help', function() {
	    console.log('Publishes \'.\' if no argument supplied');
	});
}