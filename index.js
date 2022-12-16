// const axios = require('axios');
const express = require('express');
const app = express();

const fs = require('fs');

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

// wall scene maker
var rows = 2;
var cols = 3;
var switchMethod = "N";
var assPath = "";
var fullscreen = false;
var locks = false;
var proof = false;
var loading = false;

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
        this.template.file = assPath.replace("\\","\\\\");
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
        this.template.name = "mc " + instNum;
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

class WSceneItem extends Template
{
    constructor(instNum, groupItem, proof, loading, yOffset) {
        super("./templates/wallSceneItemTemplate.json");
        this.template.name = "mc " + instNum;
        this.template.id = instNum
        if (proof) {
            this.template.bounds.x = screenWidth / 6;
            this.template.bounds.y = screenHeight / (2 * instCount); // 2 here is the amount of screen the instances will take up
            if (loading) {
                this.template.crop_right = screenWidth / 2.25;
                this.template.crop_top = screenHeight / 2.5 / 2.5; // second 2.5 here is the normal width multiplier
            }
            this.template.pos.x = screenWidth - this.template.bounds.x;
            this.template.pos.y = screenHeight - this.template.bounds.y * (instNum - yOffset);
        }
        else {
            this.template.bounds.x = wallItemWidth
            this.template.bounds.y = wallItemHeight;
            this.template.pos.x = wallItemWidth * ((instNum - 1) % cols);
            this.template.pos.y = wallItemHeight * Math.floor((instNum - 1) / cols);
        }
        if (groupItem)
        {
            this.template.group_item_backup = true;
        }
    }
}

class IScene extends Template
{
    constructor(instNum, proof, loading) {
        super("./templates/instSceneTemplate.json");
        if (switchMethod == "F") {
            this.template.hotkeys["OBSBasic.SelectScene"][0].key = "OBS_KEY_F" + (instNum + 12);
            this.template.hotkeys["OBSBasic.SelectScene"][1].key = "OBS_KEY_F" + (instNum + 12);
        }
        else if (switchMethod == "ARR") {
            // keyToSet = switchArray[instNum];
        }
        else if (switchMethod == "N") {
            this.template.hotkeys["OBSBasic.SelectScene"][0].key = "OBS_KEY_NUM" + instNum;
            this.template.hotkeys["OBSBasic.SelectScene"][1].key = "OBS_KEY_NUM" + instNum;
        }
        else if (switchMethod == "ASS" || switchMethod == "rawalle") {
            delete this.template.hotkeys["OBSBasic.SelectScene"];
        }
        this.template.name = "Instance " + instNum;
        this.template.settings.items[0].name = "mc " + instNum;
        // for (var i = 0; i < 2; i++) {
            this.template.settings.items[0].bounds.x = screenWidth;
            this.template.settings.items[0].bounds.y = screenHeight;
        // }
        if (proof) {
            var yOffset = 0;
            for (var i = 1; i <= instCount; i++)
            {
                if (i != instNum) {
                    this.template.settings.items.push(new WSceneItem(i, false, true, loading, yOffset).template);
                }
                if (i == instNum) {
                    yOffset = 1;
                }
            }
            this.template.settings.items[1].id = instCount + 1;
        }
    }
}

class WSceneLock extends Template
{
    constructor(instNum, groupItem) {
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
        if (groupItem)
        {
            this.template.group_item_backup = true;
        }
    }
}

class GroupSource extends Template
{
    constructor(type) {
        super("./templates/groupTemplate.json");
        if (type == "lock")
        {
            this.template.name = "lock group";
        }
        else if (type == "mc")
        {
            this.template.name = "mc group";
        }
        else if (type == "proof")
        {
            this.template.name = "proof";
        }
        this.template.settings.cx = screenWidth;
        this.template.settings.cy = screenHeight;
    }
}

class WSceneGroup extends Template
{
    constructor(lock) {
        super("./templates/wallSceneItemTemplate.json");
        if (lock)
        {
            this.template.name = "lock group";
            this.template.id = 2;
        }
        else
        {
            this.template.name = "mc group";
            this.template.id = 1;
        }
        this.template.bounds.x = 0;
        this.template.bounds.y = 0;
        this.template.bounds_type = 0;
    }
}

class WScene extends Template
{
    constructor() {
        super("./templates/wallSceneTemplate.json");
        // if (switchMethod == "N" || switchMethod == "F") {
        //     this.template.hotkeys["OBSBasic.SelectScene"][0].key = "OBS_KEY_F12";
        // }
        if (switchMethod == "ASS" || switchMethod == "rawalle") {
            delete this.template.hotkeys["OBSBasic.SelectScene"];
        }
    }
}

class WallSceneCollection extends Template
{
    constructor() {
        super("./templates/collectionTemplate.json");
        this.template.name = cols + "x" + rows + " wall";
        let wallScene = new WScene();

        // needs to be within scope of the code below
        let mcGroup = new GroupSource("mc").template;
        let lockGroup = new GroupSource("lock").template;
        // let proofGroup = new GroupSource("proof").template;

        for (var i = 1; i <= instCount; i++)
        {
            this.template.scene_order.push({name:"Instance " + (i)});
            if (fullscreen) {
                this.template.sources.push(new GCSource(i).template);
            }
            else {
                this.template.sources.push(new WCSource(i).template);
            }
            if (switchMethod == "ASS") {
                this.template.modules["advanced-scene-switcher"].fileSwitches.push(new ASSSwitcher(i).template);
            }
            let wSceneMc = new WSceneItem(i, locks, false, 0).template;
            if (locks) {
                this.template.sources.push(new LockSource(i).template);
                lockGroup.settings.items.push(new WSceneLock(i, false).template);
                mcGroup.settings.items.push(new WSceneItem(i, false, false, 0).template);
                wallScene.template.settings.items.push(new WSceneLock(i, true).template);
            }
            wallScene.template.settings.items.push(wSceneMc);

            this.template.sources.push(new IScene(i, proof, loading).template);
        }
        if (switchMethod == "ASS") {
            this.template.modules["advanced-scene-switcher"].fileSwitches.push(new ASSSwitcher(0).template);
            this.template.modules["advanced-scene-switcher"].readPath = assPath;
        }
        else {
            delete this.template.modules["advanced-scene-switcher"];
        }

        if (locks)
        {
            this.template.groups.push(mcGroup);
            this.template.groups.push(lockGroup);

            wallScene.template.settings.items.push(new WSceneGroup(false).template);
            wallScene.template.settings.items.push(new WSceneGroup(true).template);
        }

        this.template.sources.push(wallScene.template);
    }
}

app.get("/wallDL", (req, res) => {
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
    assPath = req.query.assPath.replace(/\\/g,"/");
    fullscreen = req.query.fullscreen;
    proof = req.query.proof;
    loading = req.query.loading;

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
        multiPath = req.query.multiPath.replace(/\\/g,"/");
        instFormat = req.query.instFormat;
        if (!multiPath || !instFormat) {
            multiPath = "";
            instFormat = "";
        }
    }

    let wall = new WallSceneCollection();
    console.log("Successfully generated wall scene with " + rows + " rows and " + cols + " columns.");
    // res.end(JSON.stringify(wall.template, null, 2));
    var noLineBreaks = `'${JSON.stringify(wall.template, null, 0)}'`;
    // noLineBreaks = noLineBreaks.replace(/[\r\n]+/gm, "" );
    res.end(`<head><link rel='stylesheet' href='./style.css'/></head><body width='100%' height='100%' style='display:flex; justify-content:center; align-items:center;'>Your download should have begun. If there are issues, please contact draconix#6540<script type='text/javascript'>function download(content, filename, contentType){if(!contentType) contentType = 'application/octet-stream';var a = document.createElement("a");var blob = new Blob([content], {'type':contentType});a.href = window.URL.createObjectURL(blob);a.download = '${cols}x${rows} wall.json';a.click();}download(${noLineBreaks}, '', 'text/plain')</script></body>`); // href='data:application/txt," + encodeURI(JSON.stringify(wall.template, null, 2)) + "' || $(document).ready(function () {$('a2').click();} || 
    // res.end(`<head><link rel='stylesheet' href='./style.css'/></head><body width='100%' height='100%' style='display:flex; justify-content:center; align-items:center;'><a id='a2' style='font-size:30px;' download='" + cols + "x" + rows + " wall.json' href='data:application/octet-stream," + encodeURI(JSON.stringify(wall.template, null, 2)) + "'><strong>Click to download</strong></a><script type='text/javascript' src='/FileSaver.js'></script><script type='text/javascript'>var blob = new Blob(['${JSON.stringify(wall.template, null, 2)}'], {type: 'text/plain;charset=utf-8'}); saveAs(blob, "${cols}x${rows} wall.json");</script></body>`); // $(document).ready(function () {$('a2').click();}
    // res.end('<html><head><meta http-equiv="Refresh" content="0; url="data:application/txt,' + encodeURI(JSON.stringify(wall.template, null, 2)) + '"/></head><body></body></html>')
});

app.use(express.static('public'));
const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log("Server is running on port " + port);
});

// for (i = 0; i < ids.users.length; i++) {
//     startHandlingEvents(ids.users[i]);
// }