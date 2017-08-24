function askTopOrgContributors(response, convo, reps) {
  convo.ask('Do you want to get a list of the top organizations contributing to specific rep/politician? If so, enter their id number. If not, gimme a no.', async (response, convo) => {
    convo.next();

    if (response.text.trim() === 'no') {
      convo.next();
    }

    const selected = find(reps, 'id', response.text.trim() )

    console.log('\nselected\n', selected, '\nresponse.text.trim\n', response.text.trim())

    const query = `${OPEN_SECRETS_BASE_URL}=candContrib&cid=${selected[0].crp_id}&cycle=2016&apikey=4047df8b3dceca553a2c5e9b0ff79582&output=json`

    const raw = await get(query)
    const data = raw.data.response.contributors;
    const flatData = flatten(data);
    const message = processIntoMessage(flatData, true)
    convo.say(message)
    convo.next()
  })
}


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
