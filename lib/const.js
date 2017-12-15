const BASE_URL = 'http://api.spm-style.com'

module.exports = {
  ERROR_COLOR: '#ff4444',
  WARNING_COLOR: '#febc07',
  SUCCESS_COLOR: '#61F661',
  INFO_COLOR: '#2a9dfd',
  CLASS_COLOR: '#00BBFF',
  MODULE_COLOR: '#FF00BB',
  INSTANCE_COLOR: '#FD7F57',
  PROJECT_COLOR: '#98F0FF',
  DEBUG_COLOR: '#FD7F57',
  REGISTRY_PATH: `${__dirname}/../registry_spm`,
  GLOBAL_PATH: `${__dirname}/../global_spm`,
  USER_DIRECTORY: process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'],
  WARNING: {
    NO_PACKAGE_SPM: 'no packge-spm.json in your project',
    NO_SPM_MODULES: 'no spm_modules was found in your project - a new spm_modules folder was created in your current directory',
    NO_PACKAGE_IN_GLOBAL_MODULE: 'don\'t find package in global module',
    NO_DEPENDENCIES_IN_PACKAGE: 'no dependencies in package-spm.json',
    NO_SPM_MODULES_IN_REGISTERY: 'no modules was found in registery'
  },
  INFO: {
    IN_GLOBAL_MODULES: 'this module is already in global spm_modules'
  },
  ERROR: {
    NO_PACKAGE_SPM: 'you cannot use spm install without any package-spm.json file',
    OUT_OF_SCOPE: 'current directory is out of scope',
    SPM_PACKAGE_NOT_FOUND: 'package spm is not found in repository',
    ALL_READY_EXIST: 'module all ready exist',
    NO_PACKAGE_IN_MODULE: 'not module in directory',
    NO_SUDO_FOR_GLOBAL: 'need to be exec in sudo for global install',
    NO_PACKAGE_TO_INSTALL: 'no dependency found - update dependencies in package-spm.json or add package name or list in your command'
  },
  PUBLISH_URL: `${BASE_URL}/module`,
  REGISTER_URL: `${BASE_URL}/user`,
  PACKAGE_URL: `${BASE_URL}/package`,
  PACKAGE_ORIGIN_URL: `${BASE_URL}/package-origin`,
  LOGIN_URL: `${BASE_URL}/user`,
  PREFERENCES: 'api.spm-style.com'
}
