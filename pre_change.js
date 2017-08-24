"use strict";

require('babel-core/register')({
        "presets": ["es2015"]
});
const axios = require('axios');
const _ = require('lodash');
const Botkit = require('Botkit');
// const dotenv = require('dotenv').config();

const controller = Botkit.slackbot({
    debug: false
});

const bot = controller.spawn({
    token: "xoxb-228962851811-00tjz44DoWs2YepqZbpX7asl"
}).startRTM();


///////////////////
// Variables
/////////////////
let PROPUBLICA_BASE_URL = "https://api.propublica.org/congress/v1";

///////////////////
// shared
/////////////////
async function get(queryString) {
  const response = await axios({
      method: 'get',
      url: queryString,
      headers: { 'X-API-Key' : 'MMG3WpX26u1S6TZpKzUhY44tGeIkDmGS1RBhoSWU' }
  })
  return response;
}
function processResponses(data) {
  let responses = _.map(data, (entry) => {
    return entry.text
  })
  return responses;
}

function processIntoMessage(object) {
  let string = '';
  Object.entries(object).forEach(([ key, value]) => {
    if( typeof value === 'string' ) {
      string += `${key}: ${value} \n`;
    }
  })
  console.log(string);
  return string;
}

function find(array, text, property) {
  const found = array.filter((item) => {
    return item[property] === text;
  })
  return found;
}

/////////////////////////////
// all state & federal reps
// google
// street address
// - change controller hears
/////////////////////////////
function processRepData(data) {
  let cleanedData = {};

  _.map(data.data.offices, (entry) => {
     	let totalOffs = entry.officialIndices.length;
      for (let i = 0; i < totalOffs; i++) {
     	 	return cleanedData[entry.name] = data.data.officials[entry.officialIndices[totalOffs - 1]];
    	}
    });
  return cleanedData;
};
controller.hears(['voting district', 'Whats my voting district'], 'direct_message,direct_mention,mention', function(bot, message) {

  const votingDistrict = function(response, convo) {

    convo.ask('I can help with that. What\'s your address?', async (response, convo ) => {
      const repData = await axios.get(`https://www.googleapis.com/civicinfo/v2/representatives?key=AIzaSyCGH0hm61rqilP4-cdWrBQGkEHJEwGdBqs&address=${convo.transcript[1].text}`)
      const processedReps = await processRepData(repData)
      const verbiage = _.map(processedReps, (entry, key) => {
        return `${key}: ${entry.name} \n`
      })
      const string = verbiage.toString();
      convo.say(string);
      convo.next();
    })
  }

  bot.startConversation(message, votingDistrict)
});


/////////////////////////////
// all house or senate reps
// Propublica
/////////////////////////////
// GET https://api.propublica.org/congress/v1/members/{chamber}/{state}/current.json
// GET https://api.propublica.org/congress/v1/{congress}/{chamber}/members.json
function askSpecificRepInfo(response, convo, reps) {
  convo.ask('Do you want more info on any of those? If yes, enter their id number for me. If not, say no.', async (response, convo) => {
      convo.next();
      if(response.text == 'no') {
        convo.next();
      }
      if (response.text.trim()) {
        const selected = find(reps, response.text.trim(), id)
        console.log('selected', selected);
      }

  })
}


controller.hears(['find senate reps', 'find senate reps', 'get senate reps', 'get house reps'], 'direct_message,direct_mention,mention', function(bot, message) {
  const getReps = (response, convo) => {

      convo.ask('Do you want the reps for the Senate or House?', async (response, convo) => {
        convo.next();
        const congress = response.text
        const query = `${ PROPUBLICA_BASE_URL }/115/${ congress }/members.json?limit=5`;
        const data = await get(query)
        const reps = data.data.results[0].members;

        reps.map( rep => {
          const message = `${rep.first_name} ${rep.last_name}, ${rep.state} member id: ${rep.id}`;
          convo.say(message);
        })

        askSpecificRepInfo(response, convo, reps)

        convo.next();
      })

  }
  bot.startConversation(message, getReps);
})


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//        TO DO
// 1 Get Congressional Statements by Search Term
// - https://projects.propublica.org/api-docs/congress-api/endpoints/#get-congressional-statements-by-search-term
//
// 2 Get Congressional Statements by Member
// - https://projects.propublica.org/api-docs/congress-api/endpoints/#get-congressional-statements-by-member
//
// 3 Get a specific member
// - https://projects.propublica.org/api-docs/congress-api/endpoints/#get-a-specific-member
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// // can be reused for both the other ones (tech),
// const askSpecific = function(response, convo) {
//    convo.ask('Do you want to do something specific?', [
//       {
//          pattern: bot.utterances.yes,
//          callback: function(response, convo) {
//             convo.say('Excellent!')
//             askWhatIsIt(response,convo);
//             convo.next();
//          }
//       },
//       {
//          pattern: bot.utterances.no,
//          default: true,
//          callback: function(response, convo) {
//             getContactFirstName(response, convo);
//             convo.next();
//          }
//       }
//    ]);
// }
