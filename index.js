const axios = require('axios');
const express = require('express');
const app = express();

const fs = require('fs');

const { ApiClient } = require('@twurple/api');
const { ClientCredentialsAuthProvider } = require('@twurple/auth');
const { EventSubListener } = require('@twurple/eventsub');
const { NgrokAdapter } = require('@twurple/eventsub-ngrok');

ids = JSON.parse(fs.readFileSync("./token.json", "utf-8"));

const authProvider = new ClientCredentialsAuthProvider(ids.twitchId, ids.twitchSecret);
const apiClient = new ApiClient({ authProvider });

const listener = new EventSubListener({apiClient, adapter: new NgrokAdapter(), secret: ids.eventSubSecret, strictHostCheck: true});

listener.listen().catch((error) => console.log(error));
apiClient.eventSub.deleteAllSubscriptions();

// gets streamer id when supplied valid username
async function getStreamerId(userName) {
	const user = await apiClient.users.getUserByName(userName)
    .catch(() => {
        return false;
    });
	if (!user) {
		return false;
	}
    return user.id;
}

// subscribe to various twitch api events using twitch user id defined in token.json, and also handle requests to the server responding with info from sheets
function startHandlingEvents(userInfo) {
    app.get(`/${userInfo.twitchUser}`, async (req, res) => {
        axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${userInfo.googleSheetId}/values/'Raw Data'!A:L?key=${ids.googleApiKey}`)
        .then((response) => {
            // column L = indexes of multiple 11 in array
            // could find a more efficient way to cycle through values later
            blinds = "No blinds today";
            for (i = 1; i < response.data.values.length; i++) {
                if (response.data.values[i][11]) {
                    if (blinds == "No blinds today") {
                        blinds = "Nether exits today: ";
                    }
                    else {
                        blinds = blinds + ", ";
                    }
                    blinds = blinds + response.data.values[i][11];
                }
                if (response.data.values[i][0] == userInfo.dateToTrackFrom) {
                    console.log("Successfully processed request for " + userInfo.twitchUser + "'s blinds: " + blinds);
                    break;
                }
            }
            res.end(blinds) // return blinds;
        })
        .catch((error) => console.error(error));
    });
    listener.subscribeToStreamOfflineEvents(userInfo.twitchChannelId, h => offlineTimer(userInfo)).catch((error) => console.log(error));
    listener.subscribeToStreamOnlineEvents(userInfo.twitchChannelId, j => checkIfReconnect(userInfo)).catch((error) => console.log(error));
    console.log(`Now handling runs for user ${userInfo.twitchUser}`);
}

// used to get new nightbot command id. do not need to use very much if already have it, or not using nightbot functionality
function getCommandId(token) {
    axios.get('https://api.nightbot.tv/1/commands/', { headers: {'Authorization':`Bearer ${token}`} })
    .then((response) => {
        for (i = 0 ; i < response.data.commands.length; i++) {
            if (response.data.commands[i].name == "!today") {
                console.log(response.data.commands[i]._id);
                break;
            }
        }
    })
    .catch(error => console.error(error));
}

// 10 minute timer which will set channel state to offline if streamer spends 10 minutes offline, used to account for disconnection issues
function offlineTimer(user) {
    user.offlineTimer = true;
    setTimeout(() => {
        if (user.channelOnline && user.offlineTimer) {
            user.channelOnline = false;
            user.offlineTimer = false;
        }
    }, 10 * 60 * 1000);
}

// runs getFirstCellDate if user was truly offline (ie. didn't reconnect when offlineTimer was true) when stream started, to avoid command resetting if accidental disconnect
function checkIfReconnect(user) {
    if (!user.offlineTimer) {
        user.dateToTrackFrom = getFirstCellDate(user.googleSheetId);
    }
}

// gets the cell in the sheet provided containing the date of the last entry in the stats sheet, pertaining to the end of the last session
async function getFirstCellDate(sheetId) {
    var dateToReturn;
    await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Raw Data'!A2?key=${ids.googleApiKey}`)
    .then((response) => {
        dateToReturn = response.data.values[0][0];
    })
    .catch((error) => {
        console.error(error);
        dateToReturn = "9/15/2022 12:00:00";
    });
    return dateToReturn;
}

// this is currently not being used as async is shitting on me, currently being run directly when get request is received
// gets the user's spreadsheet, today's runs and returns them
async function getTodayRuns(userInfo) {
    await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${userInfo.googleSheetId}/values/'Raw Data'!A:L?key=${ids.googleApiKey}`)
    .then((response) => {
        // column L = indexes of multiple 11 in array
        // could find a more efficient way to cycle through values later
        blinds = "No blinds today";
        for (i = 12; i < response.data.values.length; i++) {
            if (response.data.values[i][11]) {
                if (blinds == "No blinds today") {
                    blinds = "Nether exits today: ";
                }
                else {
                    blinds = blinds + ", ";
                }
                blinds = blinds + response.data.values[i][11];
            }
            if (response.data.values[i][0] == userInfo.dateToTrackFrom) {
                console.log("Successfully processed request for " + userInfo.twitchUser + "'s blinds: " + blinds);
                return blinds;
            }
        }
    })
    .catch((error) => console.error(error));
    // add back nightbot functionality later(?)
}

app.use(express.static('public'));
const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log("Server is Running")
});

app.get("/giveUrl", async function (req, res) {
    res.send("todaycommandupdater.glitch.me/" + req.query.user);
    idToAdd = await getStreamerId(req.query.user);
    sheetId = req.query.sheet.split("/");
    for (i = 0; i < sheetId.length; i++) {
        if (sheetId[i] == "d") {
            sheetId = sheetId[i + 1];
            break;
        }
    }
    getFirstCellDate(sheetId).then((response) => {
        userInfo = {
            twitchUser: `${req.query.user}`,
            twitchChannelId: `${idToAdd}`,
            channelOnline: true,
            offlineTimer: false,
            googleSheetId: `${sheetId}`,
            dateToTrackFrom: `${response}`
        };
        ids.users.push(userInfo);
        fs.writeFileSync("./token.json", JSON.stringify(ids, null, 2));
        startHandlingEvents(userInfo);
    });
});

for (i = 0; i < ids.users.length; i++) {
    startHandlingEvents(ids.users[i]);
}