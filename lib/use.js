let Fs = require('fs');
let Path = require('path');

let Chalk = require('chalk');
let Inquirer = require('inquirer');

let Use = require('./models').Use;
let Common = require('./common');
let CONST = require('./const');

const displayFunc = false;

let list = (val) => { //probablement à rajouter dans Common
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

let testPathesPromise = (use) => { //(-1)
	return new Promise((resolve, reject) => {
		if (use.usePathes && use.usePathes.length){
			for (let item of use.usePathes){
				if (item.endsWith('.css') || item.endsWith('.scss')){
					if (Fs.existsSync(`${item.startsWith('/') ? item : use.initialPath + '/' + item}`))
						return resolve(use);
				}
			}
			return reject('no file existing');
		}else
			return resolve(use);
	});
}

let findPackagePromise = (use) => { //(0)
	if (displayFunc) console.log('> findPackagePromise');
  	return new Promise((resolve, reject) => {
	    if (Path.relative(CONST.USER_DIRECTORY, use.path).startsWith('../'))
			return reject(CONST.ERROR.OUT_OF_SCOPE);
		if (Fs.existsSync(use.path + '/package-spm.json')){
			use.pathPackage = use.path + '/package-spm.json';
			if (!Fs.existsSync(use.path + '/spm_modules'))
				return reject('please install a module before using it');
			else
				use.pathModules = use.path + '/spm_modules';
			if (!use.usePathes || !use.usePathes.length){
				Common.getPackageSpmFilePromise(use.pathPackage)
				.then(res => {
					use.jsonFile = res;
					return resolve(use);
				});
			}else
				return resolve(use);
		}else{
			let useBis = Object.assign({}, use);
			useBis.path = use.path.substring(0, use.path.lastIndexOf('/'));
			findPackagePromise(useBis)
			.then(resolve)
			.catch(reject);	
		}
 	});
}

let promptChoiceInListPromise = (list, message, index = 0) => { //Common ?
	return new Promise((resolve, reject) => {
		if (!list || !list.length)
			return reject('incorrect list');
		let questions = [{
			name: 'res',
			type: 'list',
			message,
			choices: list,
			default: list[index]
		}];
		Inquirer.prompt(questions)
		.then(answer => {
			return resolve(answer.res);
		})
		.catch(reject);
	});
}

let selectModulePromise = (use) => { //(1)
	if (displayFunc) console.log('> selectModulePromise');
	return new Promise((resolve, reject) => {
		Fs.readdir(`${use.pathModules}`, (err, files) => {
			if (err)
				return reject(err);
			use.moduleChoices = [];
			for (let file of files){
				if (Fs.statSync(`${use.pathModules}/${file}`).isDirectory())
					use.moduleChoices.push(file)
			}
			if (!use.moduleChoices.length)
				return reject('no module found in your project');
			if (!use.targetModule){
				use.modules = use.moduleChoices;
				return resolve(use);
			}else if (use.modules.length){
				if (!use.moduleChoices.includes(use.modules[0]))
					return reject(`module ${use.modules[0]} not found`);
				else
					return resolve(use);
			}else{
				promptChoiceInListPromise(use.moduleChoices, 'select the targeted module')
				.then(res => {
					use.modules = [res];
					return resolve(use);
				})
				.catch(reject);
			}
		});
	});
}

let selectClassPromise = (use) => { //(2)
	if (displayFunc) console.log('> selectClassPromise');
	return new Promise((resolve, reject) => {
		let maxLen = 0;
		let tmp_modules = [];
		let tmp_classes = [];
		let promises = [];
		for (let module of use.modules){
			promises.push(Common.getPackageSpmFilePromise(`${use.pathModules}/${module}/package-spm.json`)
			.then(res => {
				let jsonFile = res;
				if (!jsonFile)
					use.warnings.push(`no package-spm.json found in ${module} module - ignored`);
				else if (!jsonFile.classes || !jsonFile.classes.length)
					use.warnings.push(`incorrect classes found in ${module} module - ignored`);
				else{
					for (let item of jsonFile.classes){
						if (use.classes.length && item.name == use.classes[0]){
							tmp_classes.push({module, class: item.name, jsonFile});
							if (!tmp_modules.includes(module))
								tmp_modules.push(module);
						}else if (!use.classes.length){
							maxLen = maxLen > module.length ? maxLen : module.length;
							tmp_classes.push({module, class: item.name, jsonFile});
							if (!tmp_modules.includes(module))
								tmp_modules.push(module);
						}
					}
				}
			}));
		}
		Promise.all(promises)
		.then(() => {
			use.modules = tmp_modules;
			use.classes = tmp_classes;
			if (!use.classes.length)
				return reject(`no class found`);
			if (use.targetClass && use.classes.length != 1){
				let classChoices = [];
				let classMap = {};
				for (let choice of use.classes){
					let key = `${!use.targetModule ? Chalk.hex('#BB00FF')(choice.module) : ''}${!use.targetModule ? ' > ' : ''}${Chalk.hex('#00FFBB')(choice.class)}`;
					classChoice.push(key);
					classMap[key] = choice;
				}
				promptChoiceInListPromise(classChoices, `select the targeted class${use.targetModule ? ' in module ' + use.modules[0] : ''}`)
				.then(res => {
					use.classes = [classMap[res]];
					use.modules = [classMap[res].module];
					return resolve(use);
				})
				.catch(reject);
			}else{
				return resolve(use);
			}
		})
		.catch(reject)
	});
}

let listInstancesInDistPromise = (distPath, module) => {
	return new Promise((resolve, reject) => {
		Fs.readdir(distPath, (err, files) => {
			if (err)
				return reject(err);
			let instances = [];
			for (let file of files){
				if (file.endsWith('.scss'))
					instances.push({module, instance: file.substring(0, file.length - 5)});
			}
			return resolve(instances);
		});
	});
}

let addInstances

let selectInstancePromise = (use) => {
	if (displayFunc) console.log('> selectInstancePromise', use.modules);
	return new Promise((resolve, reject) => {
		let promises = [];
		for (let module of use.modules){
			if (Fs.existsSync(`${use.pathModules}/${module}/dist`)){
				promises.push(listInstancesInDistPromise(`${use.pathModules}/${module}/dist`, module));
			}
		}
		Promise.all(promises)
		.then(res => {
			let tmp_instances = [];
			let multiInstance = {};
			for (let table of res)
				tmp_instances = tmp_instances.concat(table);
			if (tmp_instances.length){
				for (let i = 0; i < tmp_instances.length; i++){
					//logique dans le cas où une instance a été entrée au départ
					if (use.instances.length && !use.instances.includes(tmp_instances[i].instance)){
						tmp_instances.splice(i, 1);
						i--;
					}else{
						if (multiInstance[tmp_instances[i].instance])
							multiInstance[tmp_instances[i].instance].push(tmp_instances[i]);
						else
							multiInstance[tmp_instances[i].instance] = [tmp_instances[i]];
					}
				}
				let choices = [];
				let instanceMap = {};
				for (let instance in multiInstance){
					if (use.targetModule || use.modules.length == 1){
						choices.push(` ${Chalk.hex(CONST.INSTANCE_COLOR)(instance)}`);
						instanceMap[` ${Chalk.hex(CONST.INSTANCE_COLOR)(instance)}`] = {module:multiInstance[instance][0].module, instance};

					}
					else{
						for (let module of multiInstance[instance]){
							choices.push(` ${Chalk.hex(CONST.MODULE_COLOR)(module.module)} > ${Chalk.hex(CONST.INSTANCE_COLOR)(instance)}`);
							instanceMap[` ${Chalk.hex(CONST.MODULE_COLOR)(module.module)} > ${Chalk.hex(CONST.INSTANCE_COLOR)(instance)}`] = {module, instance};
						}
					}
				}
				if (!choices.length)
					return reject('no instance has been found');
				if (choices.length == 1){
					use.pathInstances = {};
					use.pathInstances[`${use.pathModules}/${instanceMap[choices[0]].module}/dist/${instanceMap[choices[0]].instance}.scss`] = instanceMap[choices[0]];
					return resolve(use);
				}
				let questions = [{
					name: 'pathInstances',
					type: 'checkbox',
					message: `select the ${Chalk.hex(CONST.INSTANCE_COLOR)('instances')} of ${Chalk.hex(CONST.MODULE_COLOR)(use.targetModule || use.modules.length == 1 ? use.modules[0] : 'modules')} you want to use\n`,
					choices,
					validate: (value) => {
						return value.length ? true : Chalk.hex(CONST.WARNING_COLOR)('select at least one instance');
					}
				}];
				use.pathInstances = {};
				Inquirer.prompt(questions)
				.then(answer => {
					for (let item of answer.pathInstances)
						use.pathInstances[`${use.pathModules}/${instanceMap[item].module}/dist/${instanceMap[item].instance}.scss`] = instanceMap[item];
					return resolve(use);
				})
				.catch(reject);
			}else
				return reject('no instance has been found');
		})
		.catch(reject);
	});
}

let recursiveListPathesPromise = (obj, filePath, use) => {
	return new Promise((resolve, reject) => {
		//avec des path cycliques risque (liens symboliques) => tracker les répertoires && fichiers déjà analysés via Path.relative
		//enlever le fichier de variables ?
		Fs.readdir(filePath, (err, files) => {
			let flag = false;
			if (err)
				return reject(err);
			let folders = [];
			let promises = [];
			let subObject = {};
			for (let file of files){
				if (file.endsWith('.scss') || file.endsWith('.css')){
					let isEntry = false;
					if (use.jsonFile.entry &&
						Fs.existsSync(`${use.path}/${use.jsonFile.entry}`) &&
						Path.relative(`${filePath}/${file}`, `${filePath}/${use.jsonFile.entry}`) == '')
						isEntry = true;
					subObject[file] = isEntry ? 'entry' : 'regular';
					flag = true;
				}
				if (Fs.statSync(`${filePath}/${file}`).isDirectory() &&
					Path.relative(`${filePath}/${file}`, use.pathModules) != '' &&
					file != 'node_modules'){
					subObject[file] = {};
					promises.push(recursiveListPathesPromise(subObject[file], `${filePath}/${file}`, use));
				}
			}
			Promise.all(promises)
			.then(booleans => {
				if (flag || booleans.includes(true)){
					Object.assign(obj, subObject);
					return resolve(true);
				}else{
					return resolve(false);
				}
			})
			.catch(reject);
		});
	});
}

let recursiveFilesTree = (obj, level, prefix, choices, choiceMap, path) => {
	let files = [];
	let folders = [];
	for (let file in obj){
		if (obj[file] == 'regular' || obj[file] == 'entry'){
			let fullFile = Chalk.hex(obj[file] == 'entry' ? CONST.SUCCESS_COLOR : CONST.PROJECT_COLOR)(`${file}${obj[file] == 'entry' ? ' (entry)' : ''}`);
			choices.push(`${Chalk.hex('#717171')(prefix + '|  ')}${fullFile}`);
			choiceMap[`${Chalk.hex('#717171')(prefix + '|  ')}${fullFile}`] = {full: `${path}/${file}`, short: file};
		}
		else if (obj[file] !== null && typeof obj[file] === 'object' && Object.keys(obj[file]).length)
			folders.push(file);
	}
	for (let i = 0; i < folders.length; i++){
		choices.push(new Inquirer.Separator(`  ${prefix}|_ ${folders[i]}/`));
		recursiveFilesTree(obj[folders[i]], level + 1, prefix + (i != folders.length - 1 ? '|  ' : '   '), choices, choiceMap, `${path}/${folders[i]}`);
	}
}

let createFilesChoicesPromise = (use) => {
	return new Promise((resolve, reject) => {
		use.choiceMap = {};
		let choices = [new Inquirer.Separator(use.path)];
		recursiveFilesTree(use.filesTree, 0, '', choices, use.choiceMap, use.path);
		let questions = [{
			name: 'files',
			type: 'checkbox',
			choices,
			message: 'select the files you want to use the instances in',
			validate: (value) => {
				return value.length ? true : Chalk.hex(CONST.WARNING_COLOR)('select at least one instance');
			}
		}];
		if (!choices.length)
			return reject('no css or scss file found');
		if (choices.length == 1){
			use.usePathes = {};
			use.usePathes[use.choiceMap[choices[0]].full] = use.choiceMap[choices[0]].short;
			return resolve(use);
		}
		Inquirer.prompt(questions)
		.then(answer => {
			use.usePathes = {};
			for (let file of answer.files)
				use.usePathes[use.choiceMap[file].full] = use.choiceMap[file].short;
			return resolve(use);
		})
		.catch(reject);
	});
}

let selectTargetFilesPromise = (use) => {
	if (displayFunc) console.log('> selectTargetFilesPromise');
	return new Promise((resolve, reject) => {
		if (!use.usePathes && use.jsonFile.entry){
			//cas avec seulement le entry
			use.usePathes = {};
			use.usePathes[`${use.path}/${use.jsonFile.entry}`] = use.jsonFile.entry;
			return resolve(use);
		}else if (use.usePathes.length){
			//cas avec un liste d'argument
			let tmp_usePathes = {};
			for (let item of use.usePathes){
				if (item.startsWith('./'))
					tmp_usePathes[`${use.initialPath}/${item.substring(2)}`] = item.substring(2);
				else if (item.startsWith('../'))
					tmp_usePathes[`${use.initialPath}/${item}`] = item;
				else
					tmp_usePathes[item] = item;
			}
			use.usePathes = tmp_usePathes;
			return resolve(use);
		}else{
			//cas avec le prompt checkbox entry précoché
			use.filesTree = {};
			//create arborescence
			recursiveListPathesPromise(use.filesTree, use.path, use)
			//display arborescence in checkbox choice
			.then(res => {return createFilesChoicesPromise(use);})
			.then(resolve)
			.catch(reject);
		}
	});
}

let updateFilePromise = (item, use) => {
	return new Promise((resolve, reject) => {
		Fs.readFile(item, 'utf8', (err, data) => {
			if (err)
				return reject(`issue reading the file ${item}`);
			let startIndex = 0;
			let i;
			let detectedImports = Common.findAllImportInString(data);
			while ((i = data.indexOf('@import ', startIndex)) >= 0){
				startIndex = data.indexOf(';', i);
				if (startIndex < -1){
					//ERROR MESSAGE INCORRECT IMPORT IN FILE ITEM
					data = null;
					break;
				}
			}
			if (!data){
				data = '';
			}
			let useBis = Object.assign({}, use);
			useBis.pathInstances = JSON.parse(JSON.stringify(use.pathInstances));
			dance:
			for (let pathInstance in useBis.pathInstances){
				for (let importedFile of detectedImports){
					if (Path.relative(`${item.substring(0, item.lastIndexOf('/'))}/${importedFile}`, pathInstance) == ''){
						delete useBis.pathInstances[pathInstance];
						useBis.warnings.push(`${use.pathInstances[pathInstance].instance} already imported in file ${use.usePathes[item]}`);
						break dance;
					}

				}
					if (!startIndex)
						//we use substring 1 because the file will never be a directory and it puts ../ anyway
						data = `@import '${Path.relative(item, pathInstance).substring(1)}';\n${data}`;
					else
						data = `${data.substring(0, startIndex + 1)}\n@import '${Path.relative(item, pathInstance).substring(1)}';${data.substring(startIndex +1)}`;
			}
			Common.writeFilePromise(item, data)
			.then(() => {return resolve({target: item, instances: useBis.pathInstances})})
			.catch(reject);
		});
	});
}

let updateUsedFilesPromise = (use) => { //(5)
	if (displayFunc) console.log('> updateUsedFilesPromise');
	return new Promise((resolve, reject) => {
		let promises = [];
		for (let item in use.usePathes){
			if (item.endsWith('.css') || item.endsWith('.scss')){
				if (Fs.existsSync(item))
					promises.push(updateFilePromise(item, use));
				else
					use.warnings.push(`${use.usePathes[item]} not found`);
			}else
				use.warnings.push(`${use.usePathes[item]} not scss or css file`);
		}
		Promise.all(promises)
		.then(targets => {
			use.pathInstances = {};
			for (let target of targets){
				use.pathInstances = Object.assign(use.pathInstances, target.instances)
			}
			if (Object.keys(use.pathInstances).length){
				console.log(`${Chalk.hex(CONST.SUCCESS_COLOR)('\nSUCCESS')}: The following instance${Object.keys(use.pathInstances).length == 1 ? ' has' : 's have'} been added:`);
				for (let item in use.pathInstances){
					console.log(`> ${Chalk.hex(CONST.INSTANCE_COLOR)(use.pathInstances[item].instance)} of module ${Chalk.hex(CONST.MODULE_COLOR)(use.pathInstances[item].module)}`);
				}
				console.log(`in file${targets.length == 1 ? '' : 's'}`);
				for (let target of targets){
					console.log(`> ${Chalk.hex(CONST.PROJECT_COLOR)(use.usePathes[target.target])}`);
				}
				console.log();
			}
			return resolve(use);
		})
		.catch(reject);
	});
}

let displayMessagesPromise = (use) => {
	if (displayFunc) console.log('> displayMessagesPromise');
	return new Promise((resolve, reject) => {
		for (let msg of use.warnings){
			console.log(`${Chalk.hex(CONST.WARNING_COLOR)('WARNING')}: ${msg}`);
		}
		return resolve(use);
	});
}

/*Only list modules where the instance has been found for 'spm u myInstance -m' ?*/

module.exports = (Program) => {
	Program
	.command('use')
	.alias('u')
	.description('to use a style instance you have already generated')
	.arguments('[instances...]')
	.option("-m, --module [module]", `to target specific module's instances`)
	// .option("-C, --class [class]", `to target specific class' instances`) ==> not in v1
	.option("-p, --path [files]", 'where the style will be imported', list)
	.action((instances, options) => {
		let use = new Use(instances, options, Common.getCurrentPath());
		//-1: check at least one element does exist
		testPathesPromise(use)
		//0: find package, modules and variables
	   	.then(findPackagePromise)
	 	//1: list Modules
	   	.then(selectModulePromise)
	   	//2: list Classes
	   	.then(selectClassPromise)
	   	//3: list Instances
	   	.then(selectInstancePromise)
	   	//4: list available files
	   	.then(selectTargetFilesPromise)
	   	//5: update used files
	   	.then(updateUsedFilesPromise)
	   	//6: display warnings
	   	.then(displayMessagesPromise)
		.catch(err => {console.log(Chalk.hex(CONST.ERROR_COLOR)(err))});
	})
	.on('--help', function() {
		//utilisé pour le comportement sans argument
	});
}