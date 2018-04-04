// require('dotenv').config()

const _ = require('lodash');
const axios = require('axios');
require('babel-core/register')({ "presets": ["es2015"] });

/////////////////////
// helper functions
////////////////////
module.exports = {

  get: async function(queryString) {
    const response = await axios({
        method: 'get',
        url: queryString,
        headers: { 'X-API-Key' : process.env.PROPUBLICA_KEY || "MMG3WpX26u1S6TZpKzUhY44tGeIkDmGS1RBhoSWU" }
    })
    // console.log('\nrespons\n', response);
    // console.log('\n errors \n', response.errors)

    return response;
  },
  processResponses: function (data) {
    let responses = _.map(data, (entry) => {
      return entry.text
    })
    return responses;
  },
  // holy hacky fuck. well it's not so much hacky as lazy. FIX THIS you slack ass punk!!!
  processIntoMessage: async function (object, regex) {
    let string = '';
    await Object.entries(object).forEach( async ([ key, value]) => {
      if( typeof value === 'string' || 'number') {

        if (regex === true) {
          key = await key.replace(/contribu.*attributes/, '').replace(/@attributes/, '').replace(/./, '').replace(/org_name: /, '');
        }
        string += `${key}: ${value} \n`;
      }
    })
    return string;
  },
  find: function (array, property, text) {
    const found = array.filter((item) => {
      return item[property].toLowerCase() === text.toLowerCase();
    })
    return found;
  },
  saySub: async function (array, convo) {
    await array.map( async (asset) => {
      await Object.entries(asset).forEach( async ([ key, value ]) => {

        const flatAsset = await helpers.processIntoMessage(value)
        await convo.say(flatAsset);
      })
      await convo.next();
    })
    return;
  },
  sayArray: async function (array, convo) {
    await array.map( async (rawMessage) => {
      const message = await helpers.processIntoMessage(rawMessage);
      await convo.say(message);
    })
  },
  buildSearchBillsQuery: function (responses, baseURL) {
    // https://api.propublica.org/congress/v1/bills/search.json?query='green technology'&sort=_score
    let url;

    if (responses[1].trim().toLowerCase() === 'phrase') {
      url = baseURL + '/bills/search.json?query=' + "'" + responses[0].trim().replace(' ', '+') + "'"
    } else {
      url = `${baseURL}/bills/search.json?query=${responses[0].trim().replace(' ', '+')}`
    }
    if (responses[2].trim().toLowerCase() === 'relevance') {
      url = `${url}&sort=_score`
    }
    console.log('\nurl\n', url);
    return url;
  }
}
