"use strict";
require('dotenv').config();

require('babel-core/register')({
        "presets": ["es2015"]
});
const axios = require('axios');
const _ = require('lodash');
const Botkit = require('botkit');
const mongoose = require('mongoose');
const flatten = require('flat');
const helpers = require('./helpers');

const Rep = require('./models/rep');

const controller = Botkit.slackbot({
    debug: false
});

const bot = controller.spawn({
    token: process.env.SLACK_TOKEN
}).startRTM();


mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/vd-bot');

/////////////////////////
// variables / constants
/////////////////////////
const PROPUBLICA_BASE_URL = 'https://api.propublica.org/congress/v1';
const OPEN_SECRETS_BASE_URL = 'http://www.opensecrets.org/api/?method';

const COMMANDS = [
  "To search Propublica\'s wicked awesome api for:\n",
  "bills in the works:  *search bills*  or  *any bills about* \n",
  "find your national reps:  *national reps*  or  *washington workforce* \n",
  "rep info:  *rep info*  or  *who is* \n",
  "last 20 rep statements: *rep statements*  or  *what did they say* \n \n",

  "Google \n",
  "find all federal and state reps:   *all reps*  or  *my workforce* \n \n",
//
  "open secrets searches \n",
  "rep summary:  *rep summary*  or  *the skinny on*  \n",
  "rep\'s top donors:  *top donors*  or  *who bankrolls* \n",
  "rep\'s personal financial disclosure:  *pfd*  or  *how they doing*"
];

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

      const repData = await axios.get(`https://www.googleapis.com/civicinfo/v2/representatives?key=${ process.env.GOOGLE_TOKEN }&address=${convo.transcript[1].text}`);

      const processedReps = await helpers.processGoogleRepData(repData);
      const message = await helpers.processGoogleCivicData(processedReps);

      convo.say(message);
      convo.next();

    });
  }
  bot.startConversation(message, myReps);
});

////////////////////////////
// propublica search bills
////////////////////////////
function askSpecificBill(response, convo, bills) {
  convo.ask('Do you want more info on a specific bill? If so, enter the bill slug number, ex: s1406. If not, please say no.', async (response, convo) => {

    if (response.text === 'no' || 'nope' || 'no thanks' ) {
      convo.say('It\'s been a pleasure to serve you, human overlord! Seriousyl, when AI takes over, I\'m soooo not gonna let them do anything to you!!! ;-) ');
      convo.next();
    }
    if (response.text) {
      let selected = bills.filter((bill) => {
        console.log('\n bill in filter \n', bill)
        return bill.bill_slug === response.text
      });
      const message = await helpers.processIntoMessage(selected[0]);
      convo.say(message);
    }
    askSpecificBill(response, convo, bills);
  });
}

controller.hears(['search bills', 'any bills about'], 'direct_message,direct_mention,mention', function(bot, message) {
  const searchBills = (response, convo) => {
      convo.ask('what do you want to search for?', (response, convo) => {
        convo.next();
        convo.ask('cool. is it keywords, like "green technology", or an exact phrase, like, "active solar power collector"? So, keywords or phrase?', (response, convo) => {
          convo.next();
          convo.ask('do you want those sorted by relevance or date?', async (response, convo) => {
            const responsesPro = helpers.processResponses(convo.responses);
            const queryString = helpers.buildSearchBillsQuery(responsesPro, PROPUBLICA_BASE_URL);
            const data = await helpers.get(queryString);
            const bills = data.data.results[0].bills;

            bills.map( async (bill) => {
              await convo.say(`----------------------------------- \n ${bill.bill_slug}: ${bill.title}`);
            });

            askSpecificBill(response, convo, bills);
            convo.next();
          })
        })
      })
    }
  bot.startConversation(message, searchBills);
});


/////////////////////////////////////
// Open Secrets - PFD
/////////////////////////////////////
controller.hears(['pfd', 'personal financial disclosure'],'direct_message,direct_mention,mention', function(bot, message) {

    const startConvo = (response, convo) => {

      convo.ask('Do you wanna a see a reps personal financial disclosure? If yes, "crp_id" me (well the rep. you know the drill by now! or i hope you do...)', async (response, convo) => {

        const query = `${OPEN_SECRETS_BASE_URL}=memPFDprofile&year=2014&cid=${response.text.trim()}&apikey=${process.env.OPEN_SECRETS_KEY}&output=json`;

        const raw = await helpers.get(query);
        const data = raw.data.response.member_profile;
        const member = data['@attributes'];
        const flatMember = await flatten(member);
        const message = await helpers.processIntoMessage(flatMember, false);

        console.log('raw,', raw, '\n data', data, '\n member', member, '\n flat member', flatMember, '\n message', message)

        convo.say(message);
        convo.next();

    })
  }
  bot.startConversation(message, startConvo);
})

/////////////////////////////////////
// Open Secrets - Rep Summary
/////////////////////////////////////
controller.hears(['open secrets summary', 'rep summary'], 'direct_message,direct_mention,mention', function(bot, message) {

  const startConvo = (response, convo) => {
    convo.ask('Enter the rep\'s "crp_id" and I\'ll getcha that report.', async (response, convo) => {
      convo.next();

      const query = `${OPEN_SECRETS_BASE_URL}=candSummary&cid=${response.text.trim()}&cycle=2016&apikey=${ process.env.OPEN_SECRETS_KEY }&output=json`;

      const raw = await helpers.get(query);
      const data = raw.data.response.summary["@attributes"];
      const flatData = flatten(data);
      const message = await helpers.processIntoMessage(flatData, false);

      console.log('raw,', raw, '\n data', data, '\n flat data', flatData, '\n message', message)

      convo.say(message);
      convo.next();

    });
  }
  bot.startConversation(message, startConvo);
})

/////////////////////////////////////
// Open Secrets - top 10 contributors
/////////////////////////////////////
controller.hears(['top donors', 'who bankrolls'], 'direct_message,direct_mention,mention', function(bot, message) {

  const startConvo = async (reponse, convo) => {
    convo.ask('Enter the rep\'s "crp_id" and I\'ll fetch them donors', async (response, convo) => {
      convo.next();

      const query = `${OPEN_SECRETS_BASE_URL}=candContrib&cid=${response.text.trim()}&cycle=2016&apikey=${ process.env.OPEN_SECRETS_KEY }&output=json`;

      const raw = await helpers.get(query);
      const data = raw.data.response.contributors;
      const flatData = await flatten(data);
      const message = await helpers.processIntoMessage(flatData, true);

      console.log('raw,', raw, '\n data', data, '\n flat data', flatData, '\n message', message)

      convo.say(message);
      convo.next();

    })
  }
  bot.startConversation(message, startConvo);
})



////////////////////////////////////////////////////////////////////////////////
// propublica rep stmts
// https://api.propublica.org/congress/v1/members/C001084/statements.json
////////////////////////////////////////////////////////////////////////////////
controller.hears(['rep statements', 'what did they say'], 'direct_message,direct_mention,mention', function(bot, message) {

  const startConvo = (reponse, convo) => {
    convo.ask(`Enter the rep\'s id to see their last 20 public statements.`, async (response, convo) => {
      convo.next();

      const query = `${PROPUBLICA_BASE_URL}/members/${response.text.trim()}/statements.json`;

      const raw = await helpers.get(query);
      const data = raw.data.results;

      console.log('raw,', raw, '\n data', data)

      await helpers.sayArray(data, convo);
      convo.next();

    })
  }
  bot.startConversation(message, startConvo);
})


//////////////////////////////
// propublica get reps detail
// ****************  refactor to say the roles *******************
//////////////////////////////
controller.hears(['rep info', 'who is'], 'direct_message,direct_mention,mention', function(bot, message) {

  const startConvo = (reponse, convo) => {
    convo.ask('What\'s their "id"? If you don\'t have it, type "national reps" to get your reps and then do another "rep info"', async (response, convo) => {
      convo.next();

      let rep = await Rep.find({"id": response.text.trim().toString() });

      const message = await helpers.processIntoMessage(rep, false);

      console.log('message', message)
      convo.say(message);
      convo.next();

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
      convo.next();

      const responses = await helpers.processResponses(convo.responses);
      const reps = await Rep.find({ "state": responses[0] });
      const message = await helpers.processIntoMessage(reps, false);

      console.log('responses', responses, '\n reps', reps, '\n message', message)

      convo.say(message);
      convo.next();

    })
  }
  bot.startConversation(message, getReps);
})

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//        TO DO
// 1 Get Congressional Statements by Search Term
// - https://projects.propublica.org/api-docs/congress-api/endpoints/#get-congressional-statements-by-search-term
/////////////////////////////////////////////////////////////////////////////////////////////////////////
