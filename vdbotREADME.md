VDBot aka Voter Dashboard Bot

I'm working on getting this up and running as a slack app and will letcha know when that happens. In the interim, you could get this bot a runnin' with the following keys:

SLACK_TOKEN
- get this by creating a bot. You'll need to sign into your slack team and add a bot user
GOOGLE Civic api
- https://developers.google.com/civic-information/
- i think this one was super easy to obtain
OPEN_SECRETS_KEY
- I emailed them for a key and they got back to me with 24 hours.
- https://www.opensecrets.org/resources/create/apis.php
PROPUBLICA_KEY
- Same as open secrets. they responded with a day.
- https://www.opensecrets.org/resources/create/apis.php


So whats VDBot do? A couple things. It uses google's civic data to do a voting location search and returns all reps for that address.

From open secrets, VDBot can getcha the top 10 contributors to a rep, the rep's personal financial disclosure, and something else I can't remember right now and am tooooo lazy to go look for (even thought it's just one file. Actually that's a lie, I want you to go explore and be surprised :) yeah that's definitely it!! :)

From ProPublica, VDBot can search bills, provide a more detailed rep summary, getcha their last 20 public statements, a couple other things i think.

A good place to start would be asking the bot for 'help' and it'll give you a list of the commands.





To Do
- pagination
- ummm. other stuff for sure...
- like lots of other stuffs.
- more other stuffs for sure.
