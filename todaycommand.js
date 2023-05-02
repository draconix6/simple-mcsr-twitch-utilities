const axios = require('axios');
const fs = require('fs');
const express = require('express');
const app = express();

const { ApiClient } = require('@twurple/api');
const { ClientCredentialsAuthProvider } = require('@twurple/auth');

ids = JSON.parse(fs.readFileSync("./token.json", "utf-8"));

const authProvider = new ClientCredentialsAuthProvider(ids.twitchId, ids.twitchSecret);
const apiClient = new ApiClient({ authProvider });

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

// converts a google sheets cell with a date formatted as shown into a parsed date for comparisons
function getCellAsParsedDate(cell) {
    // example date: 9/21/2022 11:56:10
    // example date object: 2023-03-07T02:32:23.000Z
    var splitDate = cell.split("/");
    var time = cell.split(" ")[1];
    var date = `${splitDate[2].split(" ")[0]}-${splitDate[0]}-${splitDate[1]}`;
    return Date.parse(`${date}T${time}.000Z`) / 1000;
}

// converts a twitch duration into a parsed date for comparisons
function getDurationAsMillis(duration) {
    // example duration: 6h15m30s
    var h = duration.split("h")[0];
    var m = duration.split("h")[1].split("m")[0];
    var s = duration.split("h")[1].split("m")[1].split("s")[0];
    return (h * 3600 + m * 60 + s);
}

app.get(`/today`, async (req, res) => {
    if (!req.query.user || !req.query.sheet) {
        res.end("Please provide valid arguments, or generate a valid URL here: today-command-updater.web.app/todaysetup");
        return;
    }
    axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${req.query.sheet}/values/'Raw Data'!A:N?key=${ids.googleApiKey}`)
    .then(async (response) => {
        var dateToTrackFrom = await apiClient.streams.getStreamByUserName(req.query.user);
        if (!dateToTrackFrom) {
            res.end("Stream currently offline.");
            console.log(`Request for ${req.query.user}'s stats unsuccessful, as they were offline.`);
            return;
        }
        dateToTrackFrom = Date.parse(dateToTrackFrom.startDate) / 1000;
        var userId = await getStreamerId(req.query.user);
        var vidList = await apiClient.videos.getVideosByUser(userId);
        var i = 0;
        // for disconnect protection:
        // loop until the latest video finished at least 10 minutes ago
        while (false) { // while (true)
            var latestVid = vidList.data[i];
            var latestVidFinish = Date.parse(latestVid.publishDate) / 1000 + getDurationAsMillis(latestVid.duration);
            console.log(dateToTrackFrom);
            console.log(latestVidFinish);
            if (dateToTrackFrom - latestVidFinish > 600000) { // 600,000 = 10 minutes in ms
                break;
            }
            dateToTrackFrom = Date.parse(latestVid.publishDate) / 1000;
            i++;
        }
        // column L = indexes of multiple 11 in array - nether exits
        // column M = indexes of multiple 12 in array - stronghold enters
        // column N = indexes of multiple 13 in array - end enters
        // could find a more efficient way to cycle through values later
        var blindPrefix = "No blinds today";
        var strongholdPrefix = "";
        var endPrefix = "";
        var blinds = "";
        var strongholds = "";
        var ends = "";
        var blindCount = 0;
        var strongholdCount = 0;
        var endCount = 0;
        for (i = 1; i < response.data.values.length; i++) {
            if (response.data.values[i][11]) {
                if (blindPrefix == "No blinds today") {
                    blindPrefix = "Blinds ";
                }
                else {
                    blinds = blinds + ", ";
                }
                blinds = blinds + response.data.values[i][11];
                blindCount += 1;
            }
            if (response.data.values[i][12]) {
                if (strongholdPrefix == "") {
                    strongholdPrefix = " | Stronghold enters ";
                }
                else {
                    strongholds = strongholds + ", ";
                }
                strongholds = strongholds + response.data.values[i][12];
                strongholdCount += 1;
            }
            if (response.data.values[i][13]) {
                if (endPrefix == "") {
                    endPrefix = " | End enters ";
                }
                else {
                    ends = ends + ", ";
                }
                ends = ends + response.data.values[i][13];
                endCount += 1;
            }
            if (getCellAsParsedDate(response.data.values[i][0]) < dateToTrackFrom) {
                var finishedCommand = `${blindPrefix}(${blindCount}) ${blinds}${strongholdPrefix}(${strongholdCount}) ${strongholds}${endPrefix}(${endCount}) ${ends}`;
                console.log("Successfully processed request for " + req.query.user + "'s pace: " + finishedCommand);
                break;
            }
        }
        res.end(finishedCommand)
    })
    .catch((error) => console.error(error));
});

var port = 3000;
app.listen(port, () => {
    console.log("Server is running on port " + port);
});