const BASE_URL = process.env.BASE_SPM_API_URL || 'https://api.spm-style.com'
const userDirectory = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME']

module.exports = {
  VERSION: '0.1.15',
  ERROR_COLOR: '#ff4444',
  WARNING_COLOR: '#febc07',
  SUCCESS_COLOR: '#61F661',
  INFO_COLOR: '#2a9dfd',
  CLASS_COLOR: '#00BBFF',
  MODULE_COLOR: '#FF00BB',
  INSTANCE_COLOR: '#FD7F57',
  PROJECT_COLOR: '#98F0FF',
  DEBUG_COLOR: '#FD7F57',
  USER_DIRECTORY: userDirectory,
  DEBUG: process.env.SPM_DEBUG === 'debug',
  SPM_DIRECTORY: `${userDirectory}/.spm`,
  REGISTRY_PATH: `${userDirectory}/.spm/registry`,
  ERROR: {
    SPM_PROJECT_NOT_FOUND: 'spm project not found in repository',
    SPM_MODULE_NOT_FOUND: 'spm module not found in repository'
  },
  PUBLISH_URL: `${BASE_URL}/module`,
  REGISTER_URL: `${BASE_URL}/user`,
  PACKAGE_URL: `${BASE_URL}/package`,
  INSTALL_URL: `${BASE_URL}/module`,
  PACKAGE_ORIGIN_URL: `${BASE_URL}/package-origin`,
  LOGIN_URL: `${BASE_URL}/user`,
  PREFERENCES: 'api.spm-style.com',
  SEARCH_RESULTS: 20,
  PROJECT_JSON_NAME: 'project-spm.json',
  MODULE_JSON_NAME: 'module-spm.json',
  INSTANCE_FOLDER: 'spm_instances',
  INSTANCE_PREFIX: '$_',
  EXPORT_PREFIX: '$$_',
  SEPARATOR: process.platform === 'win32' ? '\\\\' : '/'
}
