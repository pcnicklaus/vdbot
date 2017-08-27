
async function getReps (response, convo, callback) {
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

      await callback(response, convo, reps)
      await convo.next();
    })
  })
}



///////////////////////////////////////////////////////////////////////////////
// Open Secrets
//

// const startConvo = async (response, convo) => {
//   await convo.ask('Do you wanna a see a reps personal financial disclosure? If yes, id me (well the rep. you know the drill by now! or i hope you do...)! If not, gimme a no.', async (response, convo) => {
//     convo.next();
//
//     if (response.text.trim() === 'no') {
//       convo.next();
//     }
//
//     const selected = await helpers.find(REPS.senate, 'id', response.text.trim())
//     if (!selected) {
//       selected = await helpers.find(REPS.senate, 'id', response.text.trim())
//     }
//
//     console.log('\nselected\n', selected)
//
//     const query = `${OPEN_SECRETS_BASE_URL}=memPFDprofile&year=2014&cid=${selected[0].crp_id}&apikey=4047df8b3dceca553a2c5e9b0ff79582&output=json`
//     console.log('\n query: >>>', query);
//     const raw = await helpers.get(query)
//     console.log("\n raw \n", raw)
//     const data = raw.data.response.member_profile;
//     console.log('\ndata\n',data)
//     const member = data['@attributes'];
//     console.log('\nmember\n', member)
//     const flatMember = await flatten(member);
//     const message = await helpers.processIntoMessage(flatMember, false)
//     await convo.say(message)
//
//     await data.assets.asset.map( async (asset) => {
//       await Object.entries(asset).forEach( async ([ key, value ]) => {
//         console.log('\n value \n', value)
//         const flatAsset = await helpers.processIntoMessage(value)
//         console.log('\n flat asset \n', flatAsset)
//         await convo.say(flatAsset);
//       })
//       convo.next();
//     })
//
//     await start(response, convo);
//     await convo.next()
// }

//
// controller.hears([ 'personal financial disclosure', 'pfd' ], 'direct_message,direct_mention,mention', function(bot, message) {
//   console.log('get reps', getReps)
//    const start = async (response, convo) => {
//      convo.ask('Do you have the i')
//      getReps(response, convo, askOpenSecretsPFD);
//    }
//    bot.startConversation(message, start)
// })

function askOpenSecretsPFD(response, convo, reps) {
  convo.ask('Do you wanna a see a reps personal financial disclosure? If yes, id me (well the rep. you know the drill by now! or i hope you do...)! If not, gimme a no.', async (response, convo) => {
    convo.next();

    if (response.text.trim() === 'no') {
      convo.next();
    }

    const selected = await helpers.find(reps, 'id', response.text.trim() )

    console.log('\nselected\n', selected, '\nresponse.text.trim\n', response.text.trim())

    const query = `${OPEN_SECRETS_BASE_URL}=memPFDprofile&year=2014&cid=${selected[0].crp_id}&apikey=4047df8b3dceca553a2c5e9b0ff79582&output=json`
    console.log('\n query: >>>', query);
    const raw = await helpers.get(query)
    console.log("\n raw \n", raw)
    const data = raw.data.response.member_profile;
    console.log('\ndata\n',data)
    const member = data['@attributes'];
    console.log('\nmember\n', member)
    const flatMember = await flatten(member);
    const message = await helpers.processIntoMessage(flatMember, false)
    await convo.say(message)

    await data.assets.asset.map( async (asset) => {
      await Object.entries(asset).forEach( async ([ key, value ]) => {
        console.log('\n value \n', value)
        const flatAsset = await helpers.processIntoMessage(value)
        console.log('\n flat asset \n', flatAsset)
        await convo.say(flatAsset);
      })
      convo.next();
    })

    await askOpenSecretsPFD(response, convo, reps);
    await convo.next()
  })
}

function askOpenSecretsSummary(response, convo) {
  convo.ask('Do you want the open secrets summary on a specific rep/politician? If so, enter their id number. If not, gimme a no.', async (response, convo) => {
    convo.next();

    if (response.text.trim() === 'no') {
      askOpenSecretsPFD(response, convo);
      convo.next();
    }

    const selected = helpers.find(REPS.senate, 'id', response.text.trim() )

    console.log('\nselected\n', selected, '\nresponse.text.trim\n', response.text.trim())

    const query = `${OPEN_SECRETS_BASE_URL}=candSummary&cid=${selected[0].crp_id}&cycle=2016&apikey=4047df8b3dceca553a2c5e9b0ff79582&output=json`;
    console.log('\n query: >>>', query);
    const raw = await helpers.get(query)

    console.log('\n raw \n \n', raw)

    const data = raw.data.response.summary["@attributes"];

    console.log('\n data yay \n \n', data)

    const flatData = await flatten(data);

    console.log('\n flatData boo \n \n', flatData)

    const message = await helpers.processIntoMessage(flatData, false);
    console.log('\n message \n\n', message)

    await convo.say(message);

    await askOpenSecretsSummary(response, convo, reps);
    await convo.next()
  })
}


function askRepInfo(response, convo, reps) {
  convo.ask('Want more info on any of them? If so, type his/her id. If not, gimme a no!!! (yay!)', async (response, convo) => {

    if (response.text.trim() === 'no') {
      askStatements(response, convo, reps)
      convo.next();
    }
    const selectedRep = _.filter(reps, (rep) => {
      return rep.id.trim() === response.text.trim();
    });
    const repData = await helpers.get(selectedRep[0].api_uri);
    const repDetail = repData.data.results[0];
    const repProcessed = helpers.processIntoMessage(repDetail)

    convo.say(repProcessed);
    askRepInfo(response, convo, reps)
    convo.next();
  })

}
// Object.entries(rep).forEach( ([ key, value ]) => {
//   if (value !== null) { convo.say(`${key}:  ${value}`) }
// })

// / controller hears...
// func askRepInfoWrapper(response, convo){
//   await get all reps.
//   askRepInfo(response, convo, reps)
// }
function askStatements(response, convo, reps) {
  convo.ask(`Wanna see their last 20 congressional statements? If so, enter their id. If not, gimme a no.`, async (response, convo) => {

    if (response.text.trim() === 'no') {
      askTopOrgContributors(response, convo, reps);
      convo.next();
    }
    const raw = await helpers.get(`${PROPUBLICA_BASE_URL}/members/${response.text.trim()}/statements.json`);
    const rawStatements = raw.data.results
    // console.log('raw.data', raw.data)

    console.log('rawST', rawStatements)

    rawStatements.map((statement) => {
      const statementProcessed = helpers.processIntoMessage(statement);
      convo.say(statementProcessed);
    })

    askStatements(response, convo, reps);

    convo.next();
  })
}

// GET https://api.propublica.org/congress/v1/members/{chamber}/{state}/current.json
controller.hears(['find rep data', 'find rep detail'], 'direct_message,direct_mention,mention', function(bot, message) {
  const getRepDetail = (response, convo) => {
    convo.ask('Whats the id of the rep you want more info on?', async (response, convo) => {
      console.log("\n local storage \n", localStorage.getItem('reps'))
      const reps = JSON.parse(localStorage.getItem('reps'))
      console.log('\n reps \n',reps)
    })
  }
  bot.startConversation(message, getRepDetail);
})
//
// 2 Get Congressional Statements by Member
// - https://projects.propublica.org/api-docs/congress-api/endpoints/#get-congressional-statements-by-member
//
// 3 Get a specific member
// - https://projects.propublica.org/api-docs/congress-api/endpoints/#get-a-specific-member
////////////




http://www.opensecrets.org/api/?method=candContrib&cid=N00009888&cycle=2016&apikey=----&output=json
//4047df8b3dceca553a2c5e9b0ff79582
// ******* NOTE - cycle i.e. year is hardcoded - 2016
////////////////////////////////////////////////////////////////////////////////
//http://www.opensecrets.org/api/?method=memPFDprofile&year=2013&cid=N00007360&output=xml&apikey=__apikey__
//
// async function getAllReps() {
//   // hit both api-docs
//   // combine them into one thing
//   // then run the ids against tem
//   const senateQuery = `${ PROPUBLICA_BASE_URL }/115/senate/members.json`;
//   const houseQuery = `${ PROPUBLICA_BASE_URL }/115/house/members.json`;
//   const senate = await helpers.get(senateQuery);
//   const house = await helpers.get(houseQuery);
//   // console.log('\nhouse\n', house)
//   // console.log('\nsenate\n', senate)
// }
// getAllReps();
