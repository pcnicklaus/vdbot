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



let propublicaBaseURL = "https://api.propublica.org/congress/v1/";
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
  return string;
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

////////////////////////////
// propublica search bills
////////////////////////////
function buildQuery(responses) {
  // https://api.propublica.org/congress/v1/bills/search.json?query='green technology'&sort=_score
  let url;

  if (responses[1].trim().toLowerCase() === 'phrase') {
    url = propublicaBaseURL + 'bills/search.json?query=' + "'" + responses[0].trim().replace(' ', '+') + "'"
  } else {
    url = `${propublicaBaseURL}bills/search.json?query=${responses[0].trim().replace(' ', '+')}`
  }
  if (responses[2].trim().toLowerCase() === 'relevance') {
    url = `${url}&sort=_score`
  }
  return url;
}
function askSpecificBill(response, convo, bills) {
  convo.ask('Do you want more info on a specific bill? If so, enter the bill slug number, ex: s1406. If not, please say no.', async (response, convo) => {
    let selected;

    if (response.text === 'no' || 'nope' || 'no thanks' ) {
      convo.say('It\'s been a pleasure to serve you, human overlord! Seriousyl, when AI takes over, I\'m soooo not gonna let them do anything to you!!! ;-) ');
      convo.next();
    }
    if (response.text) {
      selected = bills.filter((bill) => {
        console.log('\n bill in filter \n', bill)
        return bill.bill_slug === response.text
      })
      const message = processIntoMessage(selected[0]);
      convo.say(message)
    }
    askSpecificBill(response, convo, bills)
  })
}
controller.hears(['search bills', 'any bills about'], 'direct_message,direct_mention,mention', function(bot, message) {
  const searchBills = (response, convo) => {
      convo.ask('what do you want to search for?', async (response, convo) => {
        convo.next()
        convo.ask('cool. is it keywords, like green technology, or an exact phrase, like, green technology in farming? So, keywords or phrase?', async(response, convo) => {
          convo.next()
          convo.ask('do you want those sorted by relevance or date?', async(response, convo) => {
            const responsesPro = processResponses(convo.responses);
            const queryString = buildQuery(responsesPro);
            const data = await get(queryString);
            const bills = data.data.results[0].bills

            bills.map( async (bill) => {
              await convo.say(`${bill.bill_slug}: ${bill.title}`);
            })
            askSpecificBill(response, convo, bills)

            convo.next()
          })
        })
      })
    }

  bot.startConversation(message, searchBills)
});
// GET https://api.propublica.org/congress/v1/members/{member-id}.json



// https://api.propublica.org/congress/v1/members/C001084/statements.json

function askStatements(response, convo, repDetail) {
  convo.ask(`Would you like any of ${repDetail.first_name} ${repDetail.last_name} congressional statements? If not, gimme a no.`, async (response, convo) => {

    if (response.text.trim() === 'no') {
      convo.next();
    }
    const raw = await get(`${propublicaBaseURL}members/${rep.id}/statements.json`);
    const rawStatements = raw.data.results

    console.log('rawST', rawStatements)

    rawStatements.map((statement) => {
      const statementProcessed = processIntoMessage(statement);
      convo.say(statementProcessed);
    })

    askStatements(response, convo, reps);

    convo.next();
  })
}

//////////////////////////////
// propublica get reps detail
//////////////////////////////
function askRepInfo(response, convo, reps) {
  convo.ask('Want more info on any of them? If so, type his/her id. If not, gimme a no!!! (yay!)', async (response, convo) => {

    if (response.text.trim() === 'no') {
      askStatements(response, convo, rep)
      convo.next();
    }
    const selectedRep = _.filter(reps, (rep) => {
      return rep.id.trim() === response.text.trim();
    });
    const repData = await get(selectedRep[0].api_uri);
    const repDetail = repData.data.results[0];
    const repProcessed = processIntoMessage(repDetail)

    convo.say(repProcessed);
    askRepInfo(response, convo, repDetail)
    convo.next();
  })

}
// Object.entries(rep).forEach( ([ key, value ]) => {
//   if (value !== null) { convo.say(`${key}:  ${value}`) }
// })

// GET https://api.propublica.org/congress/v1/members/{chamber}/{state}/current.json
controller.hears(['find senate reps', 'find senate reps', 'get senate reps', 'get house reps'], 'direct_message,direct_mention,mention', function(bot, message) {
  const getReps = (response, convo) => {
    convo.ask('What state do you live in? Two letter abbreviation, please!', async (response, convo) => {
      convo.next()
      convo.ask('Do you want the reps for the Senate or House?', async (response, convo) => {
        convo.next();
        const responses = processResponses(convo.responses)
        const senateOrHouse = responses[1].trim();
        const state = responses[0].trim();
        const query = `${ propublicaBaseURL }members/${senateOrHouse }/${ state }/current.json`;
        const data = await get(query)
        const reps = data.data.results;

        reps.map( rep => {
          const message = `${rep.name}, ${rep.role}, member id: ${rep.id}`;
          convo.say(message);
        })

        askRepInfo(response, convo, reps)

        convo.next();
      })
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
