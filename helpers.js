require('dotenv').config()

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
        headers: { 'X-API-Key' : process.env.PROPUBLICA_KEY }
    })

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
  processGoogleRepData: function(data) {
    let cleanedData = {};

    _.map(data.data.offices, (entry) => {
       	let totalOffs = entry.officialIndices.length;
        for (let i = 0; i < totalOffs; i++) {
       	 	return cleanedData[entry.name] = data.data.officials[entry.officialIndices[totalOffs - 1]];
      	}
      });
    return cleanedData;
  },
  processGoogleCivicData: function(data) {
    let string = ''
    _.map(data, (entry, key) => {

      _.map(entry, (obj) => {

          if(typeof obj === 'string') {
            string += `${obj} \n`
          }

          if(typeof obj === 'object') {
            _.map(obj, (sub) => {
                if (typeof sub === 'object') {
                  let raw = _.valuesIn(sub);
                  let entry = `${raw.join(' ')} \n`
                  string += entry
                }
                if (typeof sub === 'string') {
                  string += `${sub} \n`
                }
            })
          }
      })
      string = `${ string } \n`;
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
  sayArray: async function (incomingArray, convo) {
    incomingArray.map( async entry => {
        let string = '\n -------------------------------------------------- \n'
        await Object.entries(entry).forEach( async ([ key, value]) => {
          if( typeof value === 'string' || 'number') {
            console.log('key', key, "\n value", value);
            string += `${key}: ${value} \n`;
          }
        })
        await convo.say(string.concat('\n'));
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
