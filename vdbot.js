"use strict";

require('babel-core/register')({
        "presets": ["es2015"]
});
const axios = require('axios');
const _ = require('lodash');
const Botkit = require('Botkit');
const flatten = require('flat')
// const dotenv = require('dotenv').config();
const helpers = require('./helpers');

const controller = Botkit.slackbot({
    debug: false
});

const bot = controller.spawn({
    token: "xoxb-228962851811-00tjz44DoWs2YepqZbpX7asl",
}).startRTM();


/////////////////////////
// variables / constants
/////////////////////////
const PROPUBLICA_BASE_URL = 'https://api.propublica.org/congress/v1';
const OPEN_SECRETS_BASE_URL = 'http://www.opensecrets.org/api/?method';
const REPS = {};
async function getHouseReps()  {
  let houseQuery = `${ PROPUBLICA_BASE_URL }/115/house/members.json`;
  const raw = await helpers.get(houseQuery);
  REPS.house = raw.data.results[0].members;
}
getHouseReps();

async function getSenateReps() {
  const senateQuery = `${ PROPUBLICA_BASE_URL }/115/senate/members.json`;
  const raw = await helpers.get(senateQuery);
  REPS.senate = raw.data.results[0].members;
}
getSenateReps();

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

const COMMANDS = [
  "To search Propublica\'s wicked awesome api for:\n",
  "bills in the works:  *search bills*  or  *any bills about* \n",
  "find your national reps:  *national reps*  or  *washington workforce* \n",
  "rep info:  *rep info*  or  *who is* \n",
  "last 20 rep statements: *rep statements*  or  *what did they say* \n \n",

  "Google \n",
  "find all federal and state reps:   *all reps*  or  *my workforce* \n \n",

  "open secrets searches \n",
  "rep summary:  *rep summary*  or  *the skinny on*  \n",
  "rep\'s top donors:  *top donors*  or  *who bankrolls* \n",
  "rep\'s personal financial disclosure:  *pfd*  or  *how they doing*"
]

////////////////////////////
// Help / all commands
////////////////////////////
controller.hears(['commands', 'help', 'what can you do', 'do something'], 'direct_message,direct_mention,mention', function(bot, message) {

  const commands = (message, convo) => {
    convo.say(COMMANDS.join(",").replace(/,/g , ""))
    convo.next();
  }
  bot.startConversation(message, commands)

});


////////////////////////////
// google civic api
////////////////////////////
controller.hears(['all reps', 'my workforce',], 'direct_message,direct_mention,mention', function(bot, message) {

  const myReps = function(response, convo) {
    convo.ask('What\'s your address?', async (response, convo ) => {
      let string = ''

      const repData = await axios.get(`https://www.googleapis.com/civicinfo/v2/representatives?key=AIzaSyCGH0hm61rqilP4-cdWrBQGkEHJEwGdBqs&address=${convo.transcript[1].text}`)
      const processedReps = await processRepData(repData)
      const verbiage = _.map(processedReps, (entry, key) => {

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

      convo.say(string);
      convo.next();
    })
  }

  bot.startConversation(message, myReps)
});

////////////////////////////
// propublica search bills
////////////////////////////
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
      const message = await helpers.processIntoMessage(selected[0]);
      await convo.say(message)
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
            const responsesPro = helpers.processResponses(convo.responses);
            const queryString = helpers.buildSearchBillsQuery(responsesPro, PROPUBLICA_BASE_URL);
            console.log('\nquery string\n', queryString)
            const data = await helpers.get(queryString);
            console.log('\n data \n', data)
            const bills = data.data.results[0].bills
            console.log('\n bills \n ', bills)

            bills.map( async (bill) => {
              console.log('\nbill\n', bill);
              await convo.say(`${bill.bill_slug}: ${bill.title}`);
            })
            await askSpecificBill(response, convo, bills)

            convo.next()
          })
        })
      })
    }

  bot.startConversation(message, searchBills)
});


/////////////////////////////////////
// Open Secrets - PFD
/////////////////////////////////////
controller.hears(['pfd', 'personal financial disclosure'],'direct_message,direct_mention,mention', function(bot, message) {

    const startConvo = async (response, convo) => {

      await convo.ask('Do you wanna a see a reps personal financial disclosure? If yes, id me (well the rep. you know the drill by now! or i hope you do...)! If not, gimme a no.', async (response, convo) => {
        convo.next();

        if (response.text.trim() === 'no') {
          convo.next();
        }

        const selected = await helpers.find(REPS.senate, 'id', response.text.trim())
        if (!selected) {
          selected = await helpers.find(REPS.senate, 'id', response.text.trim())
        }

        console.log('\nselected\n', selected)

        const query = `${OPEN_SECRETS_BASE_URL}=memPFDprofile&year=2014&cid=${selected[0].crp_id}&apikey=4047df8b3dceca553a2c5e9b0ff79582&output=json`
        console.log('\n query: >>>', query);

        const raw = await helpers.get(query)
        const data = raw.data.response.member_profile;
        const member = data['@attributes'];

        console.log('\ndata\n',data)
        console.log('\nmember\n', member)

        const flatMember = await flatten(member);
        const message = await helpers.processIntoMessage(flatMember, false)
        await convo.say(message)

        await helpers.saySub(data.assets.asset, convo)

        await startConvo(response, convo);
        await convo.next()

    })
  }

  bot.startConversation(message, startConvo)

})

/////////////////////////////////////
// Open Secrets - Rep Summary
/////////////////////////////////////
controller.hears(['open secrets summary', 'rep summary'], 'direct_message,direct_mention,mention', function(bot, message) {

  const startConvo = async (reponse, convo) => {
    await convo.ask('What rep do you want to get the summary for? Enter their id or no if youre done', async (response, convo) => {
      await convo.next();

      if (response.text.trim() === 'no') {
        convo.next();
      }

      const selected = await helpers.find(REPS.senate, 'id', response.text.trim())
      if (!selected) {
        selected = await helpers.find(REPS.house, 'id', response.text.trim())
      }

      const query = `${OPEN_SECRETS_BASE_URL}=candSummary&cid=${selected[0].crp_id}&cycle=2016&apikey=4047df8b3dceca553a2c5e9b0ff79582&output=json`;
      console.log('\n query: >>>', query);

      const raw = await helpers.get(query)
      const data = raw.data.response.summary["@attributes"];
      // console.log('\n data yay \n \n', data)

      const flatData = await flatten(data);
      // console.log('\n flatData boo \n \n', flatData)

      const message = await helpers.processIntoMessage(flatData, false);
      // console.log('\n message \n\n', message)

      await convo.say(message);
      await startConvo(response, convo);
      await convo.next()

    })
  }
  bot.startConversation(message, startConvo)
})

/////////////////////////////////////
// Open Secrets - top 10 contributors
/////////////////////////////////////
controller.hears(['top donors', 'who bankrolls'], 'direct_message,direct_mention,mention', function(bot, message) {

  const startConvo = async (reponse, convo) => {
    await convo.ask('Do you want the top 10 organizations contributing to a rep? If so, what id. If not, gimme a no.', async (response, convo) => {
      await convo.next();

      if (response.text.trim() === 'no') {
        convo.next();
      }

      const selected = await helpers.find(REPS.senate, 'id', response.text.trim())
      if (!selected) {
        selected = await helpers.find(REPS.house, 'id', response.text.trim())
      }


      const query = `${OPEN_SECRETS_BASE_URL}=candContrib&cid=${selected[0].crp_id}&cycle=2016&apikey=4047df8b3dceca553a2c5e9b0ff79582&output=json`;
      console.log('\n query: >>>', query);

      const raw = await helpers.get(query)
      const data = raw.data.response.contributors;
      console.log('\n data yay \n \n', data)

      const flatData = await flatten(data);
      console.log('\n flatData boo \n \n', flatData)

      const message = await helpers.processIntoMessage(flatData, true);
      console.log('\n message \n\n', message)

      await convo.say(message);
      await startConvo(response, convo);
      await convo.next()

    })
  }
  bot.startConversation(message, startConvo)
})



////////////////////////////////////////////////////////////////////////////////
// propublica rep stmts
// https://api.propublica.org/congress/v1/members/C001084/statements.json
////////////////////////////////////////////////////////////////////////////////
controller.hears(['rep statements', 'what did they say'], 'direct_message,direct_mention,mention', function(bot, message) {

  const startConvo = async (reponse, convo) => {
    await convo.ask(`Enter a rep\'s id to see their last 20 statements. If you don\'t wanna, gimme a no.`, async (response, convo) => {
      convo.next();

      if (response.text.trim() === 'no') {
        convo.next();
      }

      const selected = await helpers.find(REPS.senate, 'id', response.text.trim())
      if (!selected) {
        selected = await helpers.find(REPS.house, 'id', response.text.trim())
      }


      const query = `${PROPUBLICA_BASE_URL}/members/${response.text.trim()}/statements.json`;
      console.log('\n query: >>>', query);

      const raw = await helpers.get(query)
      const data = raw.data.results;
      console.log('\n data yay \n \n', data)

      await helpers.sayArray(data, convo)
      startConvo(response, convo);
      convo.next()

    })
  }
  bot.startConversation(message, startConvo)
})


//////////////////////////////
// propublica get reps detail
// - refactor to say the roles
//////////////////////////////
controller.hears(['rep info', 'who is'], 'direct_message,direct_mention,mention', function(bot, message) {

  const startConvo = async (reponse, convo) => {
    await convo.ask('Want more info on any of them? If so, type his/her id. If not, gimme a no.', async (response, convo) => {
      convo.next();

      if (response.text.trim() === 'no') {
        convo.next();
      }

      const selected = await helpers.find(REPS.senate, 'id', response.text.trim())
      if (!selected) {
        selected = await helpers.find(REPS.house, 'id', response.text.trim())
      }


      const query = `${selected[0].api_uri}`;
      console.log('\n query: >>>', query);

      const raw = await helpers.get(query)
      const data = raw.data.results[0];
      console.log('\n data yay \n \n', data)

      // const flatData = await flatten(data);
      // console.log('\n flatData boo \n \n', flatData)

      const message = await helpers.processIntoMessage(data, false);
      console.log('\n message \n\n', message)

      await convo.say(message);
      await startConvo(response, convo);
      convo.next()

    })
  }
  bot.startConversation(message, startConvo)
})

////////////////////////////////////////////////////////////
// propublica get reps detail
// - refactor search locally and not hit propublica
////////////////////////////////////////////////////////////
controller.hears(['national reps', 'washington workforce'], 'direct_message,direct_mention,mention', function(bot, message) {
  const getReps = (response, convo) => {
    convo.ask('What state do you live in? Two letter abbreviation, please!', async (response, convo) => {
      convo.next()
      convo.ask('Do you want the reps for the Senate or House?', async (response, convo) => {
        convo.next();
        const responses = await helpers.processResponses(convo.responses)
        const senateOrHouse = responses[1].trim();
        const state = responses[0].trim();
        const query = `${ PROPUBLICA_BASE_URL }/115/${senateOrHouse }/members.json`;
        const data = await helpers.get(query)
        const reps = data.data.results[0].members;
        const stateReps = await helpers.find(reps, 'state', state)

        stateReps.map( async rep => {
          const message = `${rep.first_name}, ${rep.last_name}, member id: ${rep.id}`;
          console.log('message\n', message)
          await convo.say(message);
        })
        await convo.next();
      })
    })
  }
  bot.startConversation(message, getReps);
})

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//        TO DO
// 1 Get Congressional Statements by Search Term
// - https://projects.propublica.org/api-docs/congress-api/endpoints/#get-congressional-statements-by-search-term
/////////////////////////////////////////////////////////////////////////////////////////////////////////
