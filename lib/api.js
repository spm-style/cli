let Mock = require('./mock_api');
let Request = require('request');

let getJsonApiPromise = (name, version) => {
  return new Promise((resolve, reject) => {
    let url = `http://localhost:3200/packages/${name}`
    if(version != 'latest'){
      url += `/${version}`
    }
    Request(url, (error, response, body) => {
      if(error){
        if(error.code == 'ECONNREFUSED'){
          reject('Server down check methode getJsonApiPromise')
        }else{
          resolve(null);
        }
      }else{
        resolve(JSON.parse(body));
      }
      // console.log('error:', error); // Print the error if one occurred
      // console.log('body:', body); // Print the HTML for the Google homepage.
    });
  });
}

// let getLatestVersionModule = (name) => {
//   for(key in Mock.latest){
//     if(key == name){
//       return Mock.latest[key];
//     }
//   }
//   return null;
// }

module.exports = {
  getJsonApiPromise
}
