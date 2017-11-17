let Inquirer = require('inquirer');
let Chalk = require('chalk');
let	Fs = require('fs');
let Path = require('path');
let Targz = require('tar.gz');
let Request = require('request');

let CONST = require('./const');

// ***** GET_CURRENT_PATH ********** ( install / )
let getCurrentPath = () => {
	return process.cwd();
}

// ***** GET_PACKAGE_SPM_FILE_PROMISE ********** ( install / )
let getPackageSpmFilePromise = (filePath) => {
	return new Promise((resolve, reject) => {
		if(!Fs.existsSync(filePath)){
			return resolve(null);
		}
		Fs.readFile(filePath, (err, data) => {
			if(err)
				return reject(err);
			return resolve(JSON.parse(data));
		})
	});
}

let writeFilePromise = (target, data) => {
	return new Promise((resolve, reject) => {
		Fs.writeFile(target, data, err => {
			if (err)
				return reject(err);
			return resolve(target);
		});
	});
}

let downloadModuleSpmPromise = (name, version, targetPath) => {
	console.log(` ==> downloading module spm ${name}@${version}`);
	return new Promise((resolve, reject) => {
		let url = `http://api.spm-style.com/modules/${name}/${version}`;

		let rootPath = null;
		let parse = Targz().createParseStream();

		parse.on('entry', function(entry){
			if (!rootPath){
            	rootPath = entry.path
        	}

			if (entry.type == 'File'){
            	let writable = Fs.createWriteStream(`${targetPath}/${entry.path.substring(rootPath.length)}`);
            		entry.on('data', (chunk) => {
            			writable.write(chunk);
            		});
        	}else if (entry.type == 'Directory'){
            	if (!Fs.existsSync(`${targetPath}/${entry.path.substring(rootPath.length)}`)){
                	Fs.mkdirSync(`${targetPath}/${entry.path.substring(rootPath.length)}`);
            	}
        	}

			entry.on('end', () => {
            	if (!entry.path.startsWith(`${rootPath}node_modules`)){
                	entry.on('end', () => {
                    	if (entry.type == 'Directory'){
                    	
                    	}else{
                        	writable.end();
                    	}
                  	});
             	}
          	});
      	});

		parse.on("end", () => {
			console.log(' <== end of module spm ' + name);
			return resolve({name: name, version: version, status: 'success'});
		});

		parse.on('error', function (err) {
			return reject(err);
		});

		Request.get(url)
		.pipe(parse);
	});
}

let removeWhitespaces = (str) => {
	if (str.length){
		let i = 0;
		while (str[i] == ' '){
			i++;
		}
		let j = str.length - 1;
		while (str[j] == ' '){
			j--;
		}
		if (j != 0){
			return str.substring(i, j + 1);
		}
	}
	return str;
}

let stringQuote = (str) => {
	let char;
	if (str.endsWith('"') || str.endsWith("'")){
		char = str[0];
	}
	if (str.startsWith('"') || str.startsWith("'")){
		if (char && str[str.length - 1] == char){
			return str;
		}else if (char){
			str = char + str.substring(1);
		}else{
			str = str + char;
		}
	}else{
		if (char){
			str = char + str;
		}else{
			str = `'${str}'`;
		}
	}
	return str;
}

let formatVariable = (str) => {
	// if (str){
	// 	if (str == 'true'){
	// 		return true;
	// 	}
	// 	if (str == 'false'){
	// 		return false;
	// 	}
	// 	let dot = 0;
	// 	for(let i = 0; i < str.length; i++){
	// 		if (str[i] == '.'){
	// 			dot++;
	// 			if (dot > 1){
	// 				return stringQuote(str);
	// 			}
	// 		}else if (str[i] < '0' || str[i] > '9'){
	// 			return stringQuote(str);
	// 		}
	// 	}
	// }
	return str;
}

let variableType = (str) => {
	if (str){
		if (str == 'true' || str == 'false'){
			return 'boolean';
		}
		let dot = 0;
		for(let i = 0; i < str.length; i++){
			if (str[i] == '.'){
				dot++;
				if (dot > 1){
					return 'string';
				}
			}else if (str[i] < '0' || str[i] > '9'){
				return 'string';
			}
		}
		return 'number';
	}
	return undefined;
}

let createFolderIfUnexistantSync = (filePath) => {
	try {
		Fs.access(filePath, Fs.constants.F_OK, err => {
			if (err){
				Fs.mkdirSync(filePath, err => {
					if (err)
						return null;
					else{
						return filePath;
					}
				})
			}else{
				return filePath;
			}
		});
	}catch (err){
		return null;
	}
}

let promptConfirmation = (res, defaultValue = false, text = 'Is this ok ?') => {
	return new Promise((resolve, reject) => {

		Inquirer.prompt([{
			type: 'confirm',
			name: 'confirmation',
			default: defaultValue,
			message: text
		}])
		.then(answer => {
			if (!answer.confirmation){
				console.log(Chalk.hex(CONST.ERROR_COLOR)("Aborted by user"));
				process.exit();
			}
			resolve(res);
		})
	})
}


let writeContent = (res, name, path = '') => {
	return new Promise((resolve, reject) => {
		Fs.writeFile(path + name, res, 'utf8', function (err) {
		    if(err){
						// need to be refactoring
						return reject(Chalk.hex(CONST.ERROR_COLOR)("Writing error or need to bu sudo"));
		    }
			return resolve(Chalk.hex(CONST.SUCCESS_COLOR)('package-spm.json has been successfully created'));
		})
	})
}


let getCurrentDirectory = () => {
	return Path.basename(process.cwd()); //nous voulons le nom du répertoire dans lequel nous travaillons, et non le répertoire où réside l'application
}


let deleteFolderRecursive = (path, callback, firstRecursive = true) => {
	if(Fs.existsSync(path)){
		for(let file of Fs.readdirSync(path)){
			let currentPath = path + '/' + file;
			if(Fs.lstatSync(currentPath).isDirectory()){
				deleteFolderRecursive(currentPath, callback, false);
			}else{
				Fs.unlinkSync(currentPath);
			}
		}
		Fs.rmdirSync(path);
		if(firstRecursive){
			return callback();
		}
	}else
		return callback()
}

let deleteFolderRecursivePromise = (path) => {
	return new Promise((resolve, reject) => {
		deleteFolderRecursive(path, () => {
			return resolve(path);
		});
	});
}

let deleteContentFolderRecursive = (path, callback, firstRecursive = true) => {
	console.log('********* DELETE CONTENT ********')
	if(Fs.existsSync(path)){
		for(let file of Fs.readdirSync(path)){
			let currentPath = path + '/' + file;
			if(Fs.lstatSync(currentPath).isDirectory()){
				console.log('********* Boucle ********')
				deleteContentFolderRecursive(currentPath, callback, false);
			}else{
				Fs.unlinkSync(currentPath);
			}
		}
		if(firstRecursive){
			return callback();
		}else{
			Fs.rmdirSync(path);
		}
	}
}

let directoryExists = (filePath) => {
    try {
		return Fs.existsSync(filePath) && Fs.statSync(filePath).isDirectory();
    } catch(err) {
		return false;
    }
}


// let compareVersion = (v1, v2) => {
// 	let tab1 = v1.split('.');
// 	let tab2 = v2.split('.');
// 	for (let i = 0; i < 3; i++){
// 		if (parseInt(tab1[i]) != parseInt(tab2[i])){
// 			return parseInt(tab1[i]) - parseInt(tab2[i])
// 		}
// 	}
// 	return 0;
// }


// let isCorrectVersion = (version, path) => {
// 	parseJsonFile(path + '/package-spm.json', (json) => {
// 		console.log(json == 'error' ? json : json.version == version)
// 		return json == 'error' ? json : json.version == version;
// 	});
// }


// let isCorrectVersion = (version, path, callback) => {
// 	parseJsonFile(path + '/package-spm.json', (json) => {
// 		callback(json == 'error' ? json : json.version == version);
// 	});
// }


// let setLocalModules = (param) => {
// 	return new Promise((resolve, reject) => {
// 		if (param.getIsGlobal()){
// 			resolve(param);
// 		}
// 		Fs.readdir(param.getPathModule(), function (err, files) {
// 		    if (err) {
// 		        throw err;
// 		    }
// 		    files.map(function (file) {
// 		        return Path.join(pathModule, file);
// 		    }).filter(function (file) {
// 		        return !Fs.statSync(file).isFile();
// 		    }).forEach(function (file) {
// 		        param.addLocalModules(file.split('/')[file.split('/').length - 1]);
// 		    });
// 		    resolve(param);
// 		});
// 	});
// }


// let setGlobalModules = (param) => {
// 	return new Promise((resolve, reject) => {
// 		Fs.readdir(CONST.GLOBAL_MODULES_PATH, function (err, files) {
// 		    if (err) {
// 		        throw err;
// 		    }
// 		    files.map(function (file) {
// 		        return Path.join(pathModule, file);
// 		    }).filter(function (file) {
// 		        return !Fs.statSync(file).isFile();
// 		    }).forEach(function (file) {
// 		        param.addGlobalModule(file.split('/')[file.split('/').length - 1]);
// 		    });
// 		    resolve(param);
// 		});
// 	});
// }


// let createObjectWithKey = (key, value) => {
// 	let obj = {};
// 	obj[key] = value;
// 	return obj
// }

let unrealRelativePath = (file1, file2) => {
	if (!file1 || !file2)
		return file2;
	let tab1 = file1.split('/');
	let tab2 = file2.split('/');
	for (let i = 0; i < tab1.length || i < tab2.length; i++){
		//attention à la logique des '..' ici - à solidifier si en début de string
		if (i < tab1.length){
			if (tab1[i] == '.'){
				tab1.splice(i, 1);
				i--;
			}
			else if (tab1[i] == '..'){
				tab1.splice(i - 1, 2);
			}
		}
		if (i < tab2.length){
			if (tab2[i] == '.'){
				tab2.splice(i, 1);
				i--;
			}
			else if (tab2[i] == '..'){
				tab2.splice(i - 1, 2);
			}
		}
	}
	let i = 0;
	while (i < tab1.length && i < tab2.length && tab1[i] == tab2[i])
		i++;
	let j = i;
	let res = '';
	while (i < tab1.length && tab1[i] != ''){
		res = res + '../';
		i++;
	}
	while (j < tab2.length){
		res = `${res}${tab2[j]}/`;
		j++;
	}
	while (res.endsWith('/'))
		res = res.slice(0, -1);
	return res;
}

let cleanFilePath = (filePath) => {
	let tab = filePath.split('/')
	for (let i = 0; i < tab.length; i++){
		if (tab[i] == '.'){
			tab.splice(i, 1);
			i--;
		}else if (tab[i] == '..'){
			tab.splice(i - 1, 2);
		}
	}
	let res = tab.join('/');
	while (res.endsWith('/'))
		res = res.slice(0, -1);
	return res;
}

// let delete


/***************** Publish *******************/
let parseJsonFileSync = (filePath) => {
	return JSON.parse(Fs.readFileSync(filePath));
}

/******************* Use *********************/
let firstLetterCapitalize = (str) => {
	if (str){
		let res = `${str[0].toUpperCase()}`;
		for (let i = 1; i < str.length; i++){
			res = `${res}${str[i].toLowerCase()}`;
		}
		return res;
	}else{
		return null
	}
}

let defineMixinName = (filePath) => {
	let table = filePath.split('/');
	let res = '';
	if (table.length < 1){
		//how to deal with this impossible case ?
	}else{
		for (let i = 0; i < table.length; i++){
			res = `${res}${firstLetterCapitalize(table[i])}`;
		}
	}
	return res.substring(0, res.length - 5);
}

let createSymlinkPromise = (path, target) => {
	return new Promise((resolve, reject) => {
		Fs.symlink(target, path, (err) => {
			if (err)
				return reject(err);
			else
				return resolve(path);
		});
	});
}

let parametersInstanceParsingPromise = (name, entryPath, parameters, packageClasses) => {
	return new Promise((resolve, reject) => {
		let variables = [];
		//on crée un objet pour les variables name: value par défault
		let variableObject = {};
		//on parse l'entry pour chercher la mixin de la classe recherchée créer un tableau d'objet avec from et to
		Fs.readFile(entryPath, 'utf8', (err, data) => {
			if (err)
				return reject(err);
			else{
				let i = data.indexOf(`@mixin spm-class_${parameters.target.name}(`);
				if (i < 0)
					return reject(`Missing mixin ${parameters.target.name} in ${entryPath}`);
				i = data.indexOf('(', i);
				let j = data.indexOf(')', i);
				let table = data.substring(i + 1, j).split(',');
				for (let index = 0; index < table.length - 1; index++){
					if (!table[index].startsWith('$local-') || !Object.keys(variableObject).includes(table[index].substring(7)))
						return reject(`wrong parameters in ${entryPath} mixins`);
					let content = {
						name: table[index].substring(7),
						value: variableObject[table[index].substring(7)]
					};
					variableObject[table[index].substring(7)] = content;
					variables.push(content);
				}
				//on update ce tableau avec les valeurs liées à l'instance
				for (let item of parameters.target.variables){
					if (!variableObject[item.name])
						return reject(`Incorrect instance variables in ${entryPath} - ${item}`);
					//item.name & item.value
					variableObject[item.name].value = item.value;
				}
				let res = '';
				for (let parameter of variables){
					res += `${parameter.value},`;
				}
				res += `'${name}'`;
				return resolve(res);
			}
		});
	});
}

let createInstancePromise = (name, target, entry, parameters, packageClasses) => {
	return new Promise((resolve, reject) => {
		// récupération de la liste des paramètres sous la forme d'un string
		parametersInstanceParsingPromise(name, `${target}/${entry}`, parameters, packageClasses)
		// contenu de ce qui est écrit dans le fichier d'instance
		.then(parametersList => {
			let data = `@import '../${entry}';\n\n@include spm-class_${parameters.target.name}(${parametersList});\n`;
			// écriture du fichier d'instance
			Fs.writeFile(`{target}/dist/${name}.scss`, data, err => {
				if (err)
					return reject(err);
				else
					return resolve(name);
			});
		})
		.catch(reject);
	});
}

let importToFile = (str, sub=false) => {
	let importAcceptedChars = [`'`, `"`];
	if (str.length > 2){
		for (let acceptedChar of importAcceptedChars){
			let split = str.split(acceptedChar);
			if (str.startsWith(acceptedChar) && split.length == 3 && split[0] == '' && split[2] == '')
				return split[1];
		}
		if (str.startsWith('url(') && str.indexOf(')') > 5 && !sub)
			return importToFile(str.substring(4, str.indexOf(')')), true);
	}
	return null;
}

let findAllImportInString = (str) => {
	let importedFiles = [];
	let i, j;
	let indexStart = 0;
	let resultFile;

	while ((i = str.indexOf('@import ', indexStart)) >= 0){
		if ((j = str.indexOf(';', i)) >= 0){
			if (resultFile = importToFile(str.substring(i + 8, j))){
				importedFiles.push(resultFile);
			}else{
				//si on détecte un import suspect ?
			}
		}
		indexStart = i + 8;
	}
	return importedFiles;
}

const SCSS_IGNORED_CHARS = [' ', '\n', '\t']
const SCSS_SELECTOR_STOP_CHARS = ['.', '[', '&', ':', ','].concat(SCSS_IGNORED_CHARS);

let cssCleaner = (str) => {
	if (!str || !str.length)
		return str;
	let startIndex = 0;
	let i, j;
	//clean of comments
	while ((i = str.indexOf('/*', startIndex)) >= 0){
		let j = str.indexOf('*/', i);
		if (j < 0)
			return str;
		str = `${str.substring(0, i)}${str.substring(j + 2)}`;
		startIndex = i + 1;
	}
	//removing neutral characters
	i = 0;
	while (i < str.length){
		if (SCSS_IGNORED_CHARS.includes(str[i])){
			j = 1;
			while (SCSS_IGNORED_CHARS.includes(str[i + j]))
				j++;
			str = `${str.substring(0, i)} ${str.substring(i + j)}`;
		}
		i++;
	}
	//removing space before and after
	return removeWhitespaces(str);
}

module.exports = {
	getCurrentPath,
	getPackageSpmFilePromise,
	promptConfirmation,
	writeContent,
	getCurrentDirectory,
	deleteFolderRecursive,
	deleteFolderRecursivePromise,
	unrealRelativePath,
	cleanFilePath,
	deleteContentFolderRecursive,
	directoryExists,
	createFolderIfUnexistantSync,
	downloadModuleSpmPromise,
	// parseJsonFile: parseJsonFile
	parseJsonFileSync: parseJsonFileSync,
	createInstancePromise,
	writeFilePromise,

	// compareVersion: compareVersion,
	// isCorrectVersion: isCorrectVersion,
	// setLocalModules: setLocalModules,
	// setGlobalModules: setGlobalModules,
	// createObjectWithKey: createObjectWithKey,
	removeWhitespaces,
	formatVariable,
	variableType,
	defineMixinName,
	findAllImportInString,
	cssCleaner
}
