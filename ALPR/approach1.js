require('dotenv').config();
const request = require('request');
const fs = require('fs');

module.exports = function recognizeImage(fileName) {
  return new Promise((resolve, reject) => {
    let intervalId = null;
    let operationLocation = '';

    fs
      .createReadStream(fileName)
      .pipe(request
        .post({
          url: process.env.COMPUTER_VISION_API_ENDPOINT,
          json: true,
          encoding: 'binary',
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.COMPUTER_VISION_API_KEY,
            'content-type': 'application/octet-stream'
          }
        }, (error, response, body) => {
          if (error) {
            return reject(error);
          }
          else if (response.statusCode === 202) {
            operationLocation = response.headers['operation-location'];
            console.log('REQUEST IS BEING PROCESSED. TRYING AGAIN IN 5s');
            intervalId = setInterval(() => {
              request.get({
                url: operationLocation,
                json: true,
                headers: {
                  'Ocp-Apim-Subscription-Key': process.env.COMPUTER_VISION_API_KEY
                }
              }, (error, response, data) => {
                if (error) {
                  return reject(error);
                }
                if (data && data.status === 'Succeeded') {
                  clearInterval(intervalId);
                  return resolve(data);
                }
              })
            }, 5000)
          } else {
            return resolve(body);
          }
        }));
  })
}

