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

/////////////////////////
// variables / constants
/////////////////////////
const PROPUBLICA_BASE_URL = 'https://api.propublica.org/congress/v1';
const OPEN_SECRETS_BASE_URL = 'http://www.opensecrets.org/api/?method';

/////////////////////
// helper functions
////////////////////
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
    if( typeof value === 'string' || 'number') {
      string += `${key}: ${value} \n`;
      console.log('\nstring\n', string)
    }
  })
  return string;
}
function find(array, property, text) {
  const found = array.filter((item) => {
    return item[property].toLowerCase() === text.toLowerCase();
  })
  return found;
}
///////////////////////////////////////////////////////////////////////////
// Google get state / local reps by address. accurate cuz its google...
// street address
// - change controller hears VERBIAGE - it's not right
///////////////////////////////////////////////////////////////////////////
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
    url = PROPUBLICA_BASE_URL + '/bills/search.json?query=' + "'" + responses[0].trim().replace(' ', '+') + "'"
  } else {
    url = `${PROPUBLICA_BASE_URL}/bills/search.json?query=${responses[0].trim().replace(' ', '+')}`
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

////////////////////////////////////////////////////////////////////////////////
// Open Secrets
// http://www.opensecrets.org/api/?method=candContrib&cid=N00009888&cycle=2016&apikey=4047df8b3dceca553a2c5e9b0ff79582&output=json
// ******* NOTE - cycle i.e. year is hardcoded - 2016
////////////////////////////////////////////////////////////////////////////////
function askTopOrgContributors(response, convo, reps) {
  convo.ask('Do you want to get a list of the top organizations contributing to specific rep/politician? If so, enter their id number. If not, gimme a no.', async (response, convo) => {
    convo.next();

    console.log('herehrehrhe');

    if (response.text.trim() === 'no') {
      convo.next();
    }
    if (request.length === 7) {
      const selected = find(reps, 'id', request )

      console.log('\nselected\n', selected)

      const query = `${OPEN_SECRETS_BASE_URL}/=candContrib&cid=${selected.crp_id}&cycle=2016&apikey=4047df8b3dceca553a2c5e9b0ff79582`

      console.log('\nquery\n', query )

      const raw = await get(query)

      console.log('\nraw\n', raw)

      convo.say(raw);
    }
    convo.next()
  })
}

////////////////////////////////////////////////////////////////////////////////
// propublica rep stmts
// https://api.propublica.org/congress/v1/members/C001084/statements.json
////////////////////////////////////////////////////////////////////////////////
function askStatements(response, convo, reps) {
  convo.ask(`Would you like any of of their congressional statements? If so, enter their id. If not, gimme a no.`, async (response, convo) => {
    convo.next()

    console.log('response.text.trim()', response.text.trim())
    console.log('response.()', response)
    if (response.text.trim() === 'no') {
      console.log('herehrkheakjhakdjshfkjahsdfkjhsadkfjhksdjhfksjhdf')
      askTopOrgContributors(response, convo, reps);
      convo.next();
    }

    if (response.length === 7) {
      console.log('herherhehrherhe')
      const raw = await get(`${PROPUBLICA_BASE_URL}/members/${response.text.trim()}/statements.json`);
      const rawStatements = raw.data.results

      rawStatements.map((statement) => {
        console.log('statement', statement)
        convo.say(processIntoMessage(statement));
      })

      askStatements(response, convo, reps);
      convo.next();
    }
  })
}

//////////////////////////////
// propublica get reps detail
//////////////////////////////
function askRepInfo(response, convo, reps) {
  convo.ask('Want more info on any of them? If so, type his/her id. If not, gimme a no!!! (yay!)', async (response, convo) => {
    convo.next();
    const request = response.text.trim()

    if (request === 'no') {
      console.log('what the fucki is goingonag on')
      askStatements(response, convo, reps)
      convo.next();
    }
    if (request.length) {
      console.log('huh mutha fucker')

      const selected = find(reps, 'id', request )
      console.log('selected', selected)
      const message = processIntoMessage(selected[0])
      console.log('message', message);
      convo.say(message);
    }

    askRepInfo(response, convo, reps)
    convo.next();
  })

}

////////////////////////////////////////////////////////////////////////////////
// propublica get all reps
// GET https://api.propublica.org/congress/v1/{congress}/{chamber}/members.json
// **********
// congress session is hardcoded - 115 currently
////////////////////////////////////////////////////////////////////////////////
controller.hears(['find senate reps', 'find senate reps', 'get senate reps', 'get house reps'], 'direct_message,direct_mention,mention', function(bot, message) {
  const getReps = (response, convo) => {
    convo.ask('What state do you live in? Two letter abbreviation, please!', async (response, convo) => {
      convo.next()
      convo.ask('Do you want the reps for the Senate or House?', async (response, convo) => {
        convo.next();
        const responses = processResponses(convo.responses)
        const senateOrHouse = responses[1].trim();
        const state = responses[0].trim();
        const query = `${ PROPUBLICA_BASE_URL }/115/${senateOrHouse }/members.json`;
        const data = await get(query)
        const reps = data.data.results[0].members;
        const stateReps = find(reps, 'state', state)

        stateReps.map( rep => {
          const message = `${rep.first_name}, ${rep.last_name}, member id: ${rep.id}`;
          console.log('message\n', message)
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


//
// if (!entry.address) { entry.address = [{ line1: '', city: '', state: '', zip: '' }] };
// if (!entry.phones) { entry.phones = [''] };
// if (!entry.urls) { entry.urls = [''] };
// if (!entry.emails) { entry.emails = [''] };
// if (!entry.channels) { entry.channels = [] };
// entry.channels.push({ type: '', id: '' })
// entry.channels.push({ type: '', id: '' })
//
// return `${key}: ${entry.name}
// ${entry.address[0].line1}
// ${entry.address[0].city}, ${entry.address[0].state}, ${entry.address[0].zip}
// ${entry.phones[0]}
// ${entry.party}
// ${entry.urls[0]}
// ${entry.emails[0]}
// ${entry.channels[0].type} - ${entry.channels[0].id}
// ${entry.channels[1].type} - ${entry.channels[1].id}`
// const flatSubs = _.map(entry, (line) => {
//   console.log("\nline", line)
//   console.log("type of line", typeof line);
//   if(typeof line == 'object') {
//     return flatten(line);
//   }
// })
//
// const flatEntry = flatten(flatSubs);
// console.log("\n flat entry\n", flatEntry);

// if (!entry.address) { entry.address = [{ line1: '', city: '', state: '', zip: '' }] };
// if (!entry.phones) { entry.phones = [''] };
// if (!entry.urls) { entry.urls = [''] };
// if (!entry.emails) { entry.emails = [''] };
// if (!entry.channels) { entry.channels = [ { type: '', id: '' }, { type: '', id: '' } ] };
//
// return `
//         ${key}: ${entry.name} \n
//         ${entry.address[0].line1} \n
//         ${entry.address[0].city}, ${entry.address[0].state}, ${entry.address[0].zip} \n
//         ${entry.phones[0]} \n
//         ${entry.party} \n
//         ${entry.urls[0]} \n
//         ${entry.emails[0]} \n
// ${entry.channels[0][0].type} - ${entry.channels[0][0].id} \n
//  ${entry.channels[0][1].type} - ${entry.channels[0][1].id} \n
//       `
// })



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
