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
async function getStreamerId(username) {
	const user = await apiClient.users.getUserByName(username)
    .catch(() => {
        return false;
    });
	if (!user) {
		return false;
	}
    return user.id;
}

function getUserIndex(username) {
    for (i = 0; i < ids.users.length; i++) {
        if (ids.users[i].twitchUser == username) {
            return i;
        }
    }
    return -1;
}

// subscribe to various twitch api events using twitch user id defined in token.json, and also handle requests to the server responding with info from sheets
function startHandlingEvents(userInfo) {
    listener.subscribeToChannelRaidEventsTo(userInfo.twitchChannelId, e => onRaid(e)).catch((error) => console.log(error));
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
    var userIndex = getUserIndex(user.twitchUser);
    ids.users[userIndex].offlineTimer = true;
    console.log("User " + user.twitchUser + " went offline. Waiting for 10 minutes to reset commands");
    setTimeout(() => {
        if (ids.users[userIndex].channelOnline && ids.users[userIndex].offlineTimer) {
            ids.users[userIndex].channelOnline = false;
            ids.users[userIndex].offlineTimer = false;
            if (ids.users[userIndex].raids != "") {
                ids.users[userIndex].raids = "-";
            }
            console.log("User " + user.twitchUser + " has been offline for 10 minutes.");
        }
    }, 10 * 60 * 1000);
}

// runs getFirstCellDate if user was truly offline (ie. didn't reconnect when offlineTimer was true) when stream started, to avoid command resetting if accidental disconnect
function checkIfReconnect(user) {
    var userIndex = getUserIndex(user.twitchUser);
    console.log("User " + user.twitchUser + " has started streaming");
    ids.users[userIndex].channelOnline = true;
    if (!user.offlineTimer && user.googleSheetId != "") {
        getFirstCellDate(user.googleSheetId).then(async (response) => {
            ids.users[userIndex].dateToTrackFrom = response;
        });
    }
}

// gets the current command and asks to update it with new raider info
function onRaid(raidInfo) {
    var userIndex = getUserIndex(raidInfo.raidedBroadcasterName);
    var raids = ids.users[userIndex].raids;
    if (raids == "-") raids = "";
    ids.users[userIndex].raids = raids + ` ${raidInfo.raidingBroadcasterName} (${raidInfo.viewers})`;
    console.log("User " + ids.users[userIndex].twitchUser + "'s raid command updated: " + ids.users[userIndex].raids);
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
        var blinds = "No blinds today";
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
    console.log("Server is running on port " + port);
});

// today command updater
app.get("/todayUrl", async (req, res) => {
    var idToAdd = await getStreamerId(req.query.user);
    if (idToAdd) {
        var sheetId = req.query.sheet.split("/");
        for (i = 0; i < sheetId.length; i++) {
            if (sheetId[i] == "d") {
                sheetId = sheetId[i + 1];
                break;
            }
        }
        getFirstCellDate(sheetId).then(async (response) => {
            var userIndex = getUserIndex(req.query.user);
            if (userIndex == -1) {
                userInfo = {
                    twitchUser: `${req.query.user}`,
                    twitchChannelId: `${idToAdd}`,
                    channelOnline: true,
                    offlineTimer: false,
                    raids: "",
                    googleSheetId: `${sheetId}`,
                    dateToTrackFrom: `${response}`
                };
                startHandlingEvents(userInfo);
                ids.users.push(userInfo);
                console.log("Pushed new user " + req.query.user + " for today command.");
                // below two lines can be outside of the if statement if a workaround for editing anyone's command is found - signing into twitch?
                fs.writeFileSync("./token.json", JSON.stringify(ids, null, 2));
                res.end("https://today-command-updater.web.app/today?user=" + req.query.user);
            }
            else {
                res.end("User is already registered. Contact draconix#6540 if you would like to change your spreadsheet.\nhttps://today-command-updater.web.app/today?user=" + req.query.user);
                // ids.users[userIndex].googleSheetId = sheetId;
                // ids.users[userIndex].dateToTrackFrom = response;
                // console.log("Edited existing user " + req.query.user + " for today command.");
            }
        });
    }
    else {
        res.end("User not found");
    }
});

app.get(`/today`, async (req, res) => {
    var userInfo = await ids.users[getUserIndex(req.query.user)];
    if (userInfo) {
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
    }
});

// raid command updater
app.get("/raidUrl", async (req, res) => {
    var idToAdd = await getStreamerId(req.query.user);
    if (idToAdd) {
        userIndex = getUserIndex(req.query.user);
        if (userIndex == -1) {
            userInfo = {
                twitchUser: `${req.query.user}`,
                twitchChannelId: `${idToAdd}`,
                channelOnline: true,
                offlineTimer: false,
                raids: "-",
                googleSheetId: "",
                dateToTrackFrom: ""
            };
            ids.users.push(userInfo);
            startHandlingEvents(userInfo);
            console.log("Pushed new user " + req.query.user + " for raid command.");
        }
        else {
            ids.users[userIndex].raid = "-";
            console.log("Edited existing user " + req.query.user + " for today command.");
        }
        fs.writeFileSync("./token.json", JSON.stringify(ids, null, 2));
        res.end("https://today-command-updater.web.app/raid?user=" + req.query.user);
    }
    else {
        res.end("User not found");
    }
});

app.get(`/raid`, async (req, res) => {
    var raids = ids.users[getUserIndex(req.query.user)].raids;
    if (raids) {
        res.end(raids);
        console.log("Successfully processed request for " + req.query.user + "'s raids: " + raids);
    }
});

// wall scene maker
var rows = 2;
var cols = 3;
var switchMethod = "N";
var assPath = "";
var fullscreen = false;
var locks = false;

class Template
{
    constructor(templateSource) {
        this.template = JSON.parse(fs.readFileSync(templateSource));
    }
}

class ASSSwitcher extends Template
{
    constructor(instNum) {
        super("./templates/assFileSwitchTemplate.json");
        this.template.file = assPath;
        if (instNum == 0) {
            this.template.target = "The Wall";
        }
        else {
            this.template.target = "Instance " + instNum;
        }
        this.template.text = "" + instNum;
    }
}

class GCSource extends Template
{
    constructor(instNum) {
        super("./templates/gcTemplate.json");
        this.template.name = "main mc " + instNum;
        this.template.settings.window = "Minecraft* - Instance " + instNum + ":GLFW30:javaw.exe";
    }
}

class WCSource extends Template
{
    constructor(instNum) {
        super("./templates/wcTemplate.json");
        this.template.name = "mc " + instNum;
        this.template.settings.window = "Minecraft* - Instance " + instNum + ":GLFW30:javaw.exe";
    }
}

class LockSource extends Template
{
    constructor(instNum) {
        super("./templates/lockTemplate.json");
        this.template.name = "lock " + instNum;
        if (multiPath && instFormat) {
            this.template.settings.file = multiPath + "/instances/" + instFormat.replace("*", instNum) + "/.minecraft/lock.png";
        }
        else {
            this.template.settings.file = "";
        }
    }
}

class IScene extends Template
{
    constructor(instNum) {
        super("./templates/instSceneTemplate.json");
        if (switchMethod == "F") {
            this.template.hotkeys["OBSBasic.SelectScene"][0].key = "OBS_KEY_F" + (instNum + 12);
        }
        else if (switchMethod == "ARR") {
            // keyToSet = switchArray[instNum];
        }
        else if (switchMethod == "N") {
            this.template.hotkeys["OBSBasic.SelectScene"][0].key = "OBS_KEY_NUM" + instNum;
        }
        this.template.name = "Instance " + instNum;
        if (fullscreen) {
            this.template.settings.items[0].name = "main mc " + instNum;
        }
        else {
            this.template.settings.items[0].name = "mc " + instNum;
        }
        for (var i = 0; i < 2; i++) {
            this.template.settings.items[0].bounds.x = screenWidth;
            this.template.settings.items[0].bounds.y = screenHeight;
        }
    }
}

class WSceneItem extends Template
{
    constructor(instNum) {
        super("./templates/wallSceneItemTemplate.json");
        this.template.name = "mc " + instNum;
        this.template.id = instNum
        this.template.bounds.x = wallItemWidth
        this.template.bounds.y = wallItemHeight;
        this.template.pos.x = wallItemWidth * ((instNum - 1) % cols);
        this.template.pos.y = wallItemHeight * Math.floor((instNum - 1) / cols);
    }
}

class WSceneLock extends Template
{
    constructor(instNum) {
        super("./templates/wallSceneLockTemplate.json");
        this.template.name = "lock " + instNum;
        this.template.id = instCount + instNum
        this.template.bounds.x = lockWidth
        this.template.bounds.y = lockHeight;
        this.template.pos.x = wallItemWidth * ((instNum - 1) % cols);
        this.template.pos.y = wallItemHeight * Math.floor((instNum - 1) / cols);
        if (lockPos == "tr") {
            this.template.pos.x += wallItemWidth - lockWidth;
        }
        else if (lockPos == "bl") {
            this.template.pos.y += wallItemHeight - lockHeight;
        }
        else if (lockPos == "br") {
            this.template.pos.x += wallItemWidth - lockWidth;
            this.template.pos.y += wallItemHeight - lockHeight;
        }
    }
}

class WScene extends Template
{
    constructor() {
        super("./templates/wallSceneTemplate.json");
        if (switchMethod == "N" || switchMethod == "F") {
            this.template.hotkeys["OBSBasic.SelectScene"][0].key = "OBS_KEY_F12";
        }
    }
}

class WallSceneCollection extends Template
{
    constructor() {
        super("./templates/collectionTemplate.json");
        this.template.name = cols + "x" + rows + " wall";
        let wallScene = new WScene();

        for (var i = 1; i <= instCount; i++)
        {
            this.template.scene_order.push({name:"Instance " + (i)});
            if (fullscreen) {
                this.template.sources.push(new GCSource(i).template);
            }
            if (switchMethod == "ASS") {
                this.template.modules["advanced-scene-switcher"].fileSwitches.push(new ASSSwitcher(i).template);
            }
            this.template.sources.push(new WCSource(i).template);
            this.template.sources.push(new IScene(i).template);
            wallScene.template.settings.items.push(new WSceneItem(i).template);
            if (locks) {
                this.template.sources.push(new LockSource(i).template);
                wallScene.template.settings.items.push(new WSceneLock(i).template);
            }
        }
        if (switchMethod == "ASS") {
            this.template.modules["advanced-scene-switcher"].fileSwitches.push(new ASSSwitcher(0).template);
            this.template.modules["advanced-scene-switcher"].readPath = assPath;
        }
        else {
            delete this.template.modules["advanced-scene-switcher"];
        }

        this.template.sources.push(wallScene.template);
    }
}

app.get("/wallDownload", (req, res) => {
    rows = Math.floor(req.query.rows);
    cols = Math.floor(req.query.cols);

    if (req.query.screenSize == "1080") {
        screenWidth = 1920;
        screenHeight = 1080;
    }
    else if (req.query.screenSize == "1440") {
        screenWidth = 2560;
        screenHeight = 1440;
    }
    else if (req.query.screenSize == "2160") {
        screenWidth = 3840;
        screenHeight = 2160;
    }
    else if (req.query.screenSize == "custom") {
        screenWidth = Math.floor(req.query.screenWidth);
        screenHeight = Math.floor(req.query.screenHeight);
        if (screenWidth == 0) {
            screenWidth = screenHeight * (16 / 9);
        }
        if (screenHeight == 0) {
            screenHeight = screenWidth / (16 / 9);
        }
    }

    switchMethod = req.query.switchMethod;
    assPath = req.query.assPath;
    fullscreen = req.query.fullscreen;

    instCount = rows * cols;
    wallItemWidth = Math.floor(screenWidth / cols);
    wallItemHeight = Math.floor(screenHeight / rows);

    locks = req.query.locks;
    if (locks) {
        lockPos = req.query.lockPos;
        lockWidth = Math.floor(req.query.lockWidth);
        lockHeight = Math.floor(req.query.lockHeight);
        if (lockWidth == 0) {
            lockWidth = lockHeight;
        }
        if (lockHeight == 0) {
            lockHeight = lockWidth;
        }
        if (lockWidth + lockHeight == 0) {
            lockWidth = 320;
            lockHeight = 320;
        }
        multiPath = req.query.multiPath.replace("\\","/").replace("\\","/");
        instFormat = req.query.instFormat;
        if (!multiPath || !instFormat) {
            multiPath = "";
            instFormat = "";
        }
    }

    let wall = new WallSceneCollection();
    console.log("Successfully generated wall scene with " + rows + " rows and " + cols + " columns.");
    res.end(JSON.stringify(wall.template));
});

for (i = 0; i < ids.users.length; i++) {
    startHandlingEvents(ids.users[i]);
}