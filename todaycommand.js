const axios = require('axios');

const { ApiClient } = require('@twurple/api');
const { ClientCredentialsAuthProvider } = require('@twurple/auth');

ids = JSON.parse(fs.readFileSync("./token.json", "utf-8"));

const authProvider = new ClientCredentialsAuthProvider(ids.twitchId, ids.twitchSecret);
const apiClient = new ApiClient({ authProvider });

function getDateFromCell() {

}

app.get(`/today`, async (req, res) => {
    axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${req.query.spreadsheet}/values/'Raw Data'!A:N?key=${ids.googleApiKey}`)
    .then((response) => {
        var dateToTrackFrom = await apiClient.getStreamByUserName(user).startDate;
        // example date: 9/21/2022 11:56:10
        console.log(dateToTrackFrom);
        var dateString = `${dateToTrackFrom.getMonth() + 1}/${dateToTrackFrom.getDate()}/${dateToTrackFrom.getFullYear()} ${dateToTrackFrom.getHours()}:${dateToTrackFrom.getMinutes()}:${dateToTrackFrom.getSeconds()}`;
        // column L = indexes of multiple 11 in array - nether exits
        // column M = indexes of multiple 12 in array - stronghold enters
        // column N = indexes of multiple 13 in array - end enters
        // could find a more efficient way to cycle through values later
        var blinds = "No blinds today";
        var strongholds = "";
        var ends = "";
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
            if (response.data.values[i][12]) {
                if (strongholds == "") {
                    strongholds = " Stronghold enters today: ";
                }
                else {
                    strongholds = strongholds + ", ";
                }
                strongholds = strongholds + response.data.values[i][12];
            }
            if (response.data.values[i][13]) {
                if (ends == "") {
                    ends = " End enters today: ";
                }
                else {
                    ends = ends + ", ";
                }
                ends = ends + response.data.values[i][13];
            }
            if (response.data.values[i][0] == dateToTrackFrom) { // if (getDateFromCell(response.data.values[i][0]) < dateToTrackFrom)
                console.log("Successfully processed request for " + req.query.twitchUser + "'s pace: " + blinds + strongholds + ends);
                break;
            }
        }
        res.end(blinds + strongholds + ends) // return blinds;
    })
    .catch((error) => console.error(error));
});

app.listen(3000, () => {
    console.log("Server is running on port " + port);
});