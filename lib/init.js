let Inquirer = require('inquirer');
let Clear = require('clear');
let Chalk = require('chalk');
let Figlet = require('figlet');
let Fs = require('fs');
let Common = require('./common');
let PackageSpm = require('./models').PackageSpm;
let CONST = require('./const');

let createPackageSpm = () => { //(1)
	Clear();
	console.log(
	  Chalk.hex('#DF5333')(
	    Figlet.textSync('spm', {horizontalLayout: 'full'})
	  )
	);
	
	return new Promise((resolve, reject) => {
		let questions = [
			{
				name: 'name',
				message: 'module name',
				default: Common.getCurrentDirectory(),
				validate: (value) => {
					return (value.length && value.length > 2) ? true : Chalk.hex(CONST.WARNING_COLOR)('use at least 3 characters');
				}
			},
			{
				name: 'version',
				default: '1.0.0',
				message: 'version:',
				validate: (value) => {
					return /^[0-9]+[.][0-9]+[.][0-9]+$/.test(value) ? true : Chalk.hex(CONST.WARNING_COLOR)('Please enter a valid version number');
				}
			},
						{
				type: 'list',
				name: 'style',
				choices: ['css', 'scss', 'sass', 'less'],
				default: 'scss',
				message: 'default style:'
			},
						{
				type: 'list',
				name: 'type',
				choices: ['native', 'component', 'template'],
				default: 'native',
				message: 'type:'
			},
			{
				name: 'main',
				default: (current) => {
					return current.name;
				},
				message: 'main class in your module'
			},
			{
				name: 'classes',
				message: 'other classes in your module'
			},
			{
				name: 'entry',
				default: (current) => {
					return `index.${current.style}`;
				},
				message: 'entry point:'
			},
			// {
			// 	name: 'extends',
			// 	when: (current) => {
			// 		return current.style == 'css';
			// 	},
			// 	message: 'css extends:'
			// },
			{
				name: 'variables',
				when: (current) => {
					return current.style == 'scss';
				},
				message: 'scss variables:'
			},
			{
				name: 'author',
				default: 'anonymous',
				message: 'author:'
			},
			{
				name: 'repository',
				message: 'repository:'
			},
			{
				name: 'readme',
				default: 'README.md',
				message: 'readme:'
			},
			{
				name: 'contributors',
				message: 'contributors:'
			},
			{
				name: 'license',
				default: 'IST',
				message: 'license:'
			},
			{
				name: 'keywords',
				message: 'keywords:'
			},
			{
				name: 'description',
				message: 'description:'
			}
		];
		Inquirer.prompt(questions)
			.then(answer => {
				let packageSpm = new PackageSpm(answer);
				console.log('About to write to ' + Common.getCurrentPath() + '/package-spm.json');
				console.log(JSON.stringify(packageSpm, null, "  "));
				resolve(packageSpm);
			})
			.catch(err => {console.log(Chalk.hex(CONST.ERROR_COLOR)("Prompt error - contact those lazy stu asses")); process.exit(0)});
	});
}

let initMainCheck = (packageSpm) => { //(3a)
	return new Promise((resolve, reject) => {
		if (!Fs.existsSync(packageSpm.entry)){
			Common.writeContent("@import 'variables-spm.scss';\n", packageSpm.entry)
			.then(() => {console.log(Chalk.hex(CONST.SUCCESS_COLOR)(`successfully created: ${packageSpm.entry}`)); return resolve(packageSpm)})
			.catch(reject);
		}else{
			//pas de check que le fichier variables-spm.scss est bien appelé dans le main si celui-ci existe déjà
			return resolve(packageSpm);
		}
	});
}
let initVariablesCheck = (packageSpm) => { //(3b)
	return new Promise((resolve, reject) => {
		if (packageSpm.style == "scss"){
			if (!Fs.existsSync('variables-spm.scss')){
				let content = '';
				for (let instanceVariable of packageSpm.variables)
					content = `${content}// $$_{instanceVariable}: ;\n`;
				Common.writeContent(content, 'variables-spm.scss')
				.then(() => {console.log(Chalk.hex(CONST.SUCCESS_COLOR)('successfully created: variables-spm.scss')); return resolve(packageSpm); })
				.catch(reject);
			}else{
				return resolve(packageSpm);
			}
		}else{
			return resolve(packageSpm);
		}
	});
}

// probably not in spm init since all projects won't have to be publicable
// let initSpmDom = (packageSpm) => {
// 	return new Promise((resolve, reject) => {
// 		if (!Fs.existsSync('ref-dom.html')){
// 			Common.writeContent(`\n`, 'ref-dom.html')
// 			.then(() => {console.log(Chalk.hex(CONST.SUCCESS_COLOR)('successfully created: ref-dom.html')); return resolve(packageSpm); })
// 			.catch(reject);
// 		}else{
// 			return resolve(packageSpm);
// 		}
// 	});
// }

let createSpmFiles = (packageSpm) => { //(3)
	//créer variables si scss, main dans tous les cas
	return new Promise((resolve, reject) => {
		initMainCheck(packageSpm)
		.then(initVariablesCheck)
		// .then(initSpmDom)
		.then(resolve)
		.catch(reject);
	});
}
module.exports = (Program) => {
	Program
	.command('init')
	.description('initializes the project with package.json')
	.action( () => {
		createPackageSpm()
		.then(res => Common.promptConfirmation(res, true))
		.then(createSpmFiles)
		.then(res => Common.writeContent(JSON.stringify(res, null, "  ") + '\n', 'package-spm.json'))
		.then(() => console.log(Chalk.hex(CONST.SUCCESS_COLOR)('successfully created: package-spm.json')));
	});
}