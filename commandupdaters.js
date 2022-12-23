// const axios = require('axios');

// const { ApiClient } = require('@twurple/api');
// const { ClientCredentialsAuthProvider } = require('@twurple/auth');
// const { EventSubListener } = require('@twurple/eventsub');
// const { NgrokAdapter } = require('@twurple/eventsub-ngrok');

// ids = JSON.parse(fs.readFileSync("./token.json", "utf-8"));

// const authProvider = new ClientCredentialsAuthProvider(ids.twitchId, ids.twitchSecret);
// const apiClient = new ApiClient({ authProvider });

// const listener = new EventSubListener({apiClient, adapter: new NgrokAdapter(), secret: ids.eventSubSecret, strictHostCheck: true});

// listener.listen().catch((error) => console.log(error));
// apiClient.eventSub.deleteAllSubscriptions();

// // gets streamer id when supplied valid username
// async function getStreamerId(username) {
// 	const user = await apiClient.users.getUserByName(username)
//     .catch(() => {
//         return false;
//     });
// 	if (!user) {
// 		return false;
// 	}
//     return user.id;
// }

// function getUserIndex(username) {
//     for (i = 0; i < ids.users.length; i++) {
//         if (ids.users[i].twitchUser == username) {
//             return i;
//         }
//     }
//     return -1;
// }

// // subscribe to various twitch api events using twitch user id defined in token.json, and also handle requests to the server responding with info from sheets
// function startHandlingEvents(userInfo) {
//     listener.subscribeToChannelRaidEventsTo(userInfo.twitchChannelId, e => onRaid(e)).catch((error) => console.log(error));
//     listener.subscribeToStreamOfflineEvents(userInfo.twitchChannelId, h => offlineTimer(userInfo)).catch((error) => console.log(error));
//     listener.subscribeToStreamOnlineEvents(userInfo.twitchChannelId, j => checkIfReconnect(userInfo)).catch((error) => console.log(error));
//     console.log(`Now handling runs for user ${userInfo.twitchUser}`);
// }

// // used to get new nightbot command id. do not need to use very much if already have it, or not using nightbot functionality
// function getCommandId(token) {
//     axios.get('https://api.nightbot.tv/1/commands/', { headers: {'Authorization':`Bearer ${token}`} })
//     .then((response) => {
//         for (i = 0 ; i < response.data.commands.length; i++) {
//             if (response.data.commands[i].name == "!today") {
//                 console.log(response.data.commands[i]._id);
//                 break;
//             }
//         }
//     })
//     .catch(error => console.error(error));
// }

// // 10 minute timer which will set channel state to offline if streamer spends 10 minutes offline, used to account for disconnection issues
// function offlineTimer(user) {
//     var userIndex = getUserIndex(user.twitchUser);
//     ids.users[userIndex].offlineTimer = true;
//     console.log("User " + user.twitchUser + " went offline. Waiting for 10 minutes to reset commands");
//     setTimeout(() => {
//         if (ids.users[userIndex].channelOnline && ids.users[userIndex].offlineTimer) {
//             ids.users[userIndex].channelOnline = false;
//             ids.users[userIndex].offlineTimer = false;
//             if (ids.users[userIndex].raids != "") {
//                 ids.users[userIndex].raids = "-";
//             }
//             console.log("User " + user.twitchUser + " has been offline for 10 minutes.");
//         }
//     }, 10 * 60 * 1000);
// }

// // runs getFirstCellDate if user was truly offline (ie. didn't reconnect when offlineTimer was true) when stream started, to avoid command resetting if accidental disconnect
// function checkIfReconnect(user) {
//     var userIndex = getUserIndex(user.twitchUser);
//     console.log("User " + user.twitchUser + " has started streaming");
//     ids.users[userIndex].channelOnline = true;
//     if (!user.offlineTimer && user.googleSheetId != "") {
//         getFirstCellDate(user.googleSheetId).then(async (response) => {
//             ids.users[userIndex].dateToTrackFrom = response;
//         });
//     }
// }

// // gets the current command and asks to update it with new raider info
// function onRaid(raidInfo) {
//     var userIndex = getUserIndex(raidInfo.raidedBroadcasterName);
//     var raids = ids.users[userIndex].raids;
//     if (raids == "-") raids = "";
//     ids.users[userIndex].raids = raids + ` ${raidInfo.raidingBroadcasterName} (${raidInfo.viewers})`;
//     console.log("User " + ids.users[userIndex].twitchUser + "'s raid command updated: " + ids.users[userIndex].raids);
// }

// // gets the cell in the sheet provided containing the date of the last entry in the stats sheet, pertaining to the end of the last session
// async function getFirstCellDate(sheetId) {
//     var dateToReturn;
//     await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Raw Data'!A2?key=${ids.googleApiKey}`)
//     .then((response) => {
//         dateToReturn = response.data.values[0][0];
//     })
//     .catch((error) => {
//         console.error(error);
//         dateToReturn = "9/15/2022 12:00:00";
//     });
//     return dateToReturn;
// }

// // this is currently not being used as async is shitting on me, currently being run directly when get request is received
// // gets the user's spreadsheet, today's runs and returns them
// async function getTodayRuns(userInfo) {
//     await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${userInfo.googleSheetId}/values/'Raw Data'!A:L?key=${ids.googleApiKey}`)
//     .then((response) => {
//         // column L = indexes of multiple 11 in array
//         // could find a more efficient way to cycle through values later
//         var blinds = "No blinds today";
//         for (i = 12; i < response.data.values.length; i++) {
//             if (response.data.values[i][11]) {
//                 if (blinds == "No blinds today") {
//                     blinds = "Nether exits today: ";
//                 }
//                 else {
//                     blinds = blinds + ", ";
//                 }
//                 blinds = blinds + response.data.values[i][11];
//             }
//             if (response.data.values[i][0] == userInfo.dateToTrackFrom) {
//                 console.log("Successfully processed request for " + userInfo.twitchUser + "'s blinds: " + blinds);
//                 return blinds;
//             }
//         }
//     })
//     .catch((error) => console.error(error));
//     // add back nightbot functionality later(?)
// }

// // today command updater
// app.get("/todayUrl", async (req, res) => {
//     var idToAdd = await getStreamerId(req.query.user);
//     if (idToAdd) {
//         var sheetId = req.query.sheet.split("/");
//         for (i = 0; i < sheetId.length; i++) {
//             if (sheetId[i] == "d") {
//                 sheetId = sheetId[i + 1];
//                 break;
//             }
//         }
//         getFirstCellDate(sheetId).then(async (response) => {
//             var userIndex = getUserIndex(req.query.user);
//             if (userIndex == -1) {
//                 userInfo = {
//                     twitchUser: `${req.query.user}`,
//                     twitchChannelId: `${idToAdd}`,
//                     channelOnline: true,
//                     offlineTimer: false,
//                     raids: "",
//                     googleSheetId: `${sheetId}`,
//                     dateToTrackFrom: `${response}`
//                 };
//                 startHandlingEvents(userInfo);
//                 ids.users.push(userInfo);
//                 console.log("Pushed new user " + req.query.user + " for today command.");
//                 // below two lines can be outside of the if statement if a workaround for editing anyone's command is found - signing into twitch?
//                 fs.writeFileSync("./token.json", JSON.stringify(ids, null, 2));
//                 // send !editcom templates for common chatbots
//                 res.end(`<p>Nightbot: !editcom !today $(urlfetch https://today-command-updater.web.app/today?user=${req.query.user})</p>
//                 <p>StreamElements: !commands edit !today $(urlfetch https://today-command-updater.web.app/today?user=${req.query.user})</p>
//                 <p>Fossabot: !editcmd !today $(customapi https://today-command-updater.web.app/today?user=${req.query.user})</p>
//                 <p>If you use a different chatbot, refer to the "variables" documentation of your chatbot to read from this URL: https://today-command-updater.web.app/today?user=${req.query.user}</p>`);
//             }
//             else {
//                 res.end(`<p>User is already registered. Contact draconix#6540 if you would like to change your spreadsheet.</p>
//                 <p>https://today-command-updater.web.app/today?user=${req.query.user}</p>`);
//                 // ids.users[userIndex].googleSheetId = sheetId;
//                 // ids.users[userIndex].dateToTrackFrom = response;
//                 // console.log("Edited existing user " + req.query.user + " for today command.");
//             }
//         });
//     }
//     else {
//         res.end("User not found");
//     }
// });

// app.get(`/today`, async (req, res) => {
//     var userInfo = await ids.users[getUserIndex(req.query.user)];
//     if (userInfo) {
//         axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${userInfo.googleSheetId}/values/'Raw Data'!A:N?key=${ids.googleApiKey}`)
//         .then((response) => {
//             // column L = indexes of multiple 11 in array - nether exits
//             // column M = indexes of multiple 12 in array - stronghold enters
//             // column N = indexes of multiple 13 in array - end enters
//             // could find a more efficient way to cycle through values later
//             var blinds = "No blinds today";
//             var strongholds = "";
//             var ends = "";
//             for (i = 1; i < response.data.values.length; i++) {
//                 if (response.data.values[i][11]) {
//                     if (blinds == "No blinds today") {
//                         blinds = "Nether exits today: ";
//                     }
//                     else {
//                         blinds = blinds + ", ";
//                     }
//                     blinds = blinds + response.data.values[i][11];
//                 }
//                 if (response.data.values[i][12]) {
//                     if (strongholds == "") {
//                         strongholds = " Stronghold enters today: ";
//                     }
//                     else {
//                         strongholds = strongholds + ", ";
//                     }
//                     strongholds = strongholds + response.data.values[i][12];
//                 }
//                 if (response.data.values[i][13]) {
//                     if (ends == "") {
//                         ends = " End enters today: ";
//                     }
//                     else {
//                         ends = ends + ", ";
//                     }
//                     ends = ends + response.data.values[i][13];
//                 }
//                 if (response.data.values[i][0] == userInfo.dateToTrackFrom) {
//                     console.log("Successfully processed request for " + userInfo.twitchUser + "'s pace: " + blinds + strongholds + ends);
//                     break;
//                 }
//             }
//             // res.end(blinds + strongholds + ends) // return blinds;
//             res.end(`Automatic today command is currently not working :\\`);
//         })
//         .catch((error) => console.error(error));
//     }
//     else {
//         res.end("User not found");
//     }
// });

// // raid command updater
// app.get("/raidUrl", async (req, res) => {
//     var idToAdd = await getStreamerId(req.query.user);
//     if (idToAdd) {
//         userIndex = getUserIndex(req.query.user);
//         if (userIndex == -1) {
//             userInfo = {
//                 twitchUser: `${req.query.user}`,
//                 twitchChannelId: `${idToAdd}`,
//                 channelOnline: true,
//                 offlineTimer: false,
//                 raids: "-",
//                 googleSheetId: "",
//                 dateToTrackFrom: ""
//             };
//             ids.users.push(userInfo);
//             startHandlingEvents(userInfo);
//             console.log("Pushed new user " + req.query.user + " for raid command.");
//         }
//         else {
//             ids.users[userIndex].raids = "-";
//             console.log("Edited existing user " + req.query.user + " for raid command.");
//         }
//         fs.writeFileSync("./token.json", JSON.stringify(ids, null, 2));
//         // send !editcom templates for common chatbots
//         res.end(`<p>Nightbot: !editcom !today $(urlfetch https://today-command-updater.web.app/raid?user=${req.query.user})</p>
//         <p>StreamElements: !commands edit !today $(urlfetch https://today-command-updater.web.app/raid?user=${req.query.user})</p>
//         <p>Fossabot: !editcmd !today $(customapi https://today-command-updater.web.app/raid?user=${req.query.user})</p>
//         <p>If you use a different chatbot, refer to the "variables" documentation of your chatbot to read from this URL: https://today-command-updater.web.app/raid?user=${req.query.user}</p>`);
//     }
//     else {
//         res.end("User not found");
//     }
// });

// app.get(`/raid`, async (req, res) => {
//     var userInfo = await ids.users[getUserIndex(req.query.user)];
//     if (userInfo) {
//         var raids = userInfo.raids;
//         if (raids) {
//             // res.end(raids);
//             res.end(`Automatic raid command is currently not working :\\`);
//             console.log("Successfully processed request for " + req.query.user + "'s raids: " + raids);
//         }
//         else {
//             res.end("User not registered for raids");
//         }
//     }
//     else {
//         res.end("User not found");
//     }
// });

// // manually reset commands, because google is not kind and won't do it itself
// app.get(`/reset`, async (req, res) => {
//     var msg = "";
//     var userIndex = await getUserIndex(req.query.user);
//     if (userIndex != -1) {
//         if (ids.users[userIndex].googleSheetId != "") {
//             await getFirstCellDate(ids.users[userIndex].googleSheetId)
//             .then(async (response) => {
//                 ids.users[userIndex].dateToTrackFrom = response;
//                 msg = msg + req.query.user + " date updated to " + response;
//             })
//             .catch((err) => res.end(err));
//         }
//         if (ids.users[userIndex].raids != "") {
//             ids.users[userIndex].raids = "-";
//             if (msg != "") {
//                 msg = msg + "\n";
//             }
//             msg = msg + req.query.user + " raids reset";
//         }
//         fs.writeFileSync("./token.json", JSON.stringify(ids, null, 2));
//     }
//     else {
//         msg = "User not found";
//     }
//     console.log("Reset commands for " + req.query.user);
//     res.end(msg);
// });