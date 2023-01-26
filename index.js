const fs = require('fs');
const express = require('express');
const app = express();

// wall scene maker

class Template {
    constructor(templateSource) {
        this.template = JSON.parse(fs.readFileSync(templateSource));
    }
}

class ASSSwitcher extends Template {
    constructor(path, instNum) {
        super("./templates/assFileSwitchTemplate.json");
        this.template.file = path;
        if (instNum == 0) {
            this.template.target = "The Wall";
        }
        else {
            this.template.target = "Instance " + instNum;
        }
        this.template.text = "" + instNum;
    }
}

class CaptureSource extends Template {
    constructor(gc, instNum) {
        if (gc) {
            super(`./templates/gcTemplate.json`);
        }
        else {
            super("./templates/wcTemplate.json");
        }
        this.template.name = "mc " + instNum;
        this.template.settings.window = "Minecraft* - Instance " + instNum + ":GLFW30:javaw.exe";
    }
}

class LockSource extends Template {
    constructor(instNum, multiPath, instFormat) {
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

class WSceneItem extends Template {
    constructor(settings, instNum, groupItem, proof = false, yOffset = 0) {
        super("./templates/wallSceneItemTemplate.json");
        this.template.name = "mc " + instNum;
        this.template.id = instNum
        if (proof) {
            this.template.bounds.x = settings.screenWidth / 6;
            this.template.bounds.y = settings.screenHeight / (2 * settings.instCount); // 2 here is the amount of screen the instances will take up
            if (settings.loading) {
                this.template.crop_right = settings.screenWidth / 2.25;
                this.template.crop_top = settings.screenHeight / 2.5 / 2.5; // second 2.5 here is the normal width multiplier
            }
            this.template.pos.x = settings.screenWidth - this.template.bounds.x;
            this.template.pos.y = settings.screenHeight - this.template.bounds.y * (instNum - yOffset);
        }
        else {
            this.template.bounds.x = settings.wallItemWidth - settings.padding;
            this.template.bounds.y = settings.wallItemHeight - settings.padding;
            this.template.pos.x = (settings.wallItemWidth + Math.floor(settings.padding / 2)) * ((instNum - 1) % settings.cols);
            this.template.pos.y = (settings.wallItemHeight + Math.floor(settings.padding / 2)) * Math.floor((instNum - 1) / settings.cols);
        }
        if (groupItem)
        {
            this.template.group_item_backup = true;
            this.template.locked = false;
        }
    }
}

class PSceneItem extends Template {
    // crop: 0 = no crop, 1 = bottom-left, 2 = center
    constructor(instNum, cols, width, height, windowWidth, windowHeight, guiScale, crop = 0, loadingSquareSize = 0, extraHeight = 0) {
        super("./templates/wallSceneItemTemplate.json");
        this.template.name = "verification " + instNum;
        this.template.id = instNum;

        let row = Math.floor((instNum - 1) / cols);
        let col = Math.floor((instNum - 1) % cols);

        switch (crop){
            case 0:
                this.template.bounds.x = width - 2 * height;
                this.template.bounds.y = height;
                this.template.pos.x = col * width;
                this.template.pos.y = row * height;
                break;
            case 1:
                this.template.bounds.x = height;
                this.template.bounds.y = height;
                this.template.pos.x = col * width + (width - height);
                this.template.pos.y = row * height;
                this.template.crop_top = windowHeight - extraHeight - loadingSquareSize;
                this.template.crop_right = windowWidth - loadingSquareSize;
                this.template.scale_filter = "point";
                break;
            case 2:
                this.template.bounds.x = height;
                this.template.bounds.y = height;
                this.template.pos.x = col * width + (width - 2 * height);
                this.template.pos.y = row * height;
                this.template.crop_top = ((windowHeight - loadingSquareSize) / 2 + (guiScale * 30)) - extraHeight;
                this.template.crop_bottom = (windowHeight - loadingSquareSize) / 2 - (guiScale * 30);
                this.template.crop_left = (windowWidth - loadingSquareSize) / 2;
                this.template.crop_right = (windowWidth - loadingSquareSize) / 2;
                this.template.scale_filter = "point";
        }
    }
}

class IScene extends Template {
    constructor(settings, instNum) {
        super("./templates/instSceneTemplate.json");
        if (settings.switchMethod == "F") {
            this.template.hotkeys["OBSBasic.SelectScene"][0].key = "OBS_KEY_F" + (instNum + 12);
            this.template.hotkeys["OBSBasic.SelectScene"][1].key = "OBS_KEY_F" + (instNum + 12);
        }
        else if (settings.switchMethod == "ARR") {
            // keyToSet = switchArray[instNum];
        }
        else if (settings.switchMethod == "N") {
            this.template.hotkeys["OBSBasic.SelectScene"][0].key = "OBS_KEY_NUM" + instNum;
            this.template.hotkeys["OBSBasic.SelectScene"][1].key = "OBS_KEY_NUM" + instNum;
        }
        else if (settings.switchMethod == "ASS" || settings.switchMethod == "C") {
            delete this.template.hotkeys["OBSBasic.SelectScene"];
        }
        this.template.name = "Instance " + instNum;
        this.template.settings.items[0].name = "mc " + instNum;
        // for (var i = 0; i < 2; i++) {
            this.template.settings.items[0].bounds.x = settings.screenWidth;
            this.template.settings.items[0].bounds.y = settings.screenHeight;
        // }
        if (settings.proof == "corner") {
            var yOffset = 0;
            for (var i = 1; i <= settings.instCount; i++) {
                if (i != instNum) {
                    this.template.settings.items.splice(1, 0, new WSceneItem(settings, i, false, true, yOffset).template);
                }
                if (i == instNum) {
                    yOffset = 1;
                }
            }
            this.template.settings.items[1].id = settings.instCount + 1; // settings.instCount + 1
        }
    }
}

class WSceneLock extends Template {
    constructor(settings, instNum, groupItem) {
        super("./templates/wallSceneLockTemplate.json");
        this.template.name = "lock " + instNum;
        this.template.id = settings.instCount + instNum
        this.template.bounds.x = settings.lockWidth
        this.template.bounds.y = settings.lockHeight;
        this.template.pos.x = settings.wallItemWidth * ((instNum - 1) % settings.cols);
        this.template.pos.y = settings.wallItemHeight * Math.floor((instNum - 1) / settings.cols);
        if (settings.lockPos == "tr") {
            this.template.pos.x += settings.wallItemWidth - settings.lockWidth;
        }
        else if (settings.lockPos == "bl") {
            this.template.pos.y += settings.wallItemHeight - settings.lockHeight;
        }
        else if (settings.lockPos == "br") {
            this.template.pos.x += settings.wallItemWidth - settings.lockWidth;
            this.template.pos.y += settings.wallItemHeight - settings.lockHeight;
        }
        else if (settings.lockPos == "c") {
            this.template.pos.x += settings.wallItemWidth / 2 - settings.lockWidth / 2;
            this.template.pos.y += settings.wallItemHeight / 2 - settings.lockHeight / 2;
        }
        if (groupItem)
        {
            this.template.group_item_backup = true;
        }
    }
}

class GroupSource extends Template {
    constructor(settings, type) {
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
        this.template.settings.cx = settings.screenWidth;
        this.template.settings.cy = settings.screenHeight;
    }
}

class WSceneGroup extends Template {
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

class WScene extends Template {
    constructor(switchMethod) {
        super("./templates/wallSceneTemplate.json");
        // if (switchMethod == "N" || switchMethod == "F") {
        //     this.template.hotkeys["OBSBasic.SelectScene"][0].key = "OBS_KEY_F12";
        // }
        if (switchMethod == "ASS" || switchMethod == "C") {
            delete this.template.hotkeys["OBSBasic.SelectScene"];
        }
    }
}

class WallSceneCollection extends Template
{
    constructor(settings) {
        super("./templates/collectionTemplate.json");

        settings.rows = Math.floor(settings.rows);
        settings.cols = Math.floor(settings.cols);
        settings.instCount = settings.rows * settings.cols;

        settings.fullscreen = settings.fullscreen == "on";

        if (settings.screenSize == "1080") {
            settings.screenWidth = 1920;
            settings.screenHeight = 1080;
        }
        else if (settings.screenSize == "1440") {
            settings.screenWidth = 2560;
            settings.screenHeight = 1440;
        }
        else if (settings.screenSize == "2160") {
            settings.screenWidth = 3840;
            settings.screenHeight = 2160;
        }
        else if (settings.screenSize == "custom") {
            settings.screenWidth = Math.floor(settings.screenWidth);
            settings.screenHeight = Math.floor(settings.screenHeight);
            if (settings.screenWidth == 0) {
                settings.screenWidth = settings.screenHeight * (16 / 9);
            }
            if (settings.screenHeight == 0) {
                settings.screenHeight = settings.screenWidth / (16 / 9);
            }
            if (settings.screenWidth + settings.screenHeight == 0) {
                settings.screenWidth = 1920;
                settings.screenHeight = 1080;
            }
        }

        if (!settings.assPath) {
            settings.assPath = "";
        }
        settings.assPath = settings.assPath.replace(/\\/g,"/");

        settings.wallItemWidth = Math.floor(settings.screenWidth / settings.cols);
        settings.wallItemHeight = Math.floor(settings.screenHeight / settings.rows);

        settings.locks = settings.locks == "on";
        if (settings.locks) {
            if (settings.lockWidth == 0) {
                settings.lockWidth = settings.lockHeight;
            }
            if (settings.lockHeight == 0) {
                settings.lockHeight = settings.lockWidth;
            }
            if (settings.lockWidth + settings.lockHeight == 0) {
                settings.lockWidth = settings.wallItemWidth / 7;
                settings.lockHeight = settings.lockWidth;
            }
            settings.lockWidth = Math.floor(settings.lockWidth);
            settings.lockHeight = Math.floor(settings.lockHeight);

            settings.multiPath = settings.multiPath.replace(/\\/g,"/");
            if (!settings.multiPath || !settings.instFormat) {
                settings.multiPath = "";
                settings.instFormat = "";
            }
        }

        settings.padding = Math.floor(settings.padding);

        if (settings.guiScale == 0) {
            settings.guiScale = 4;
        }
        settings.guiScale = Math.floor(settings.guiScale);
        settings.borderless = settings.borderless == "on";

        this.template.name = settings.cols + "x" + settings.rows + " wall";
        let wallScene = new WScene(settings.switchMethod);
        if (settings.proof == "scene") {
            var proofScene = new WScene(settings.switchMethod);
            proofScene.template.name = "Verification";
            var windowWidth = settings.screenWidth;
            var windowHeight = settings.screenHeight;

            // new proof recording crops setup - credits to duncan
            if (settings.widthMultiplier != 0) {
                windowHeight = Math.floor(windowHeight / settings.widthMultiplier);
            }
            else if (!settings.borderless) {
                windowWidth += 16;
                windowHeight -= 24;
            }
            if (!settings.borderless) {
                // win10 border sizes
                windowWidth -= 16;
                windowHeight -= 39;
            }
            // ---STRUCTURAL INTEGRITY DUCKS AHEAD---
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // ---END OF STRUCTURAL INTEGRITY DUCKS---

            var proofRows = Math.floor(Math.sqrt(settings.instCount)) - 1;
            var proofCols = 0;
            var sizeRatio = 0;

            do {
                proofRows += 1;
                proofCols = Math.ceil(settings.instCount / proofRows);
                sizeRatio = Math.floor(settings.screenWidth / proofCols) / Math.floor(settings.screenHeight / proofRows);
            } while (sizeRatio < 3.5 && proofCols != 1);

            var proofWidth = Math.floor(settings.screenWidth / proofCols);
            var proofHeight = Math.floor(settings.screenHeight / proofRows);

            // does not account for forceUnicodeFont option being true
            // in which case an odd number GUI scale must increment by 1
            // idk if it's too worth
            let x = 1;
            while (x != settings.guiScale && x < windowWidth && x < windowHeight && windowWidth / (x + 1) >= 320 && windowHeight / (x + 1) >= 240) {
                x++;
            }

            var loadingSquareSize = x * 90;
            var extraHeight = x * 19;

            for (var i = 1; i <= settings.instCount; i++) {
                let proofSource = new CaptureSource(false, i);
                proofSource.template.name = "verification " + i;
                this.template.sources.push(proofSource.template);
                proofScene.template.settings.items.push(new PSceneItem(i, proofCols, proofWidth, proofHeight, windowWidth, windowHeight, x).template);
                proofScene.template.settings.items.push(new PSceneItem(i, proofCols, proofWidth, proofHeight, windowWidth, windowHeight, x, 1, loadingSquareSize, extraHeight).template);
                proofScene.template.settings.items.push(new PSceneItem(i, proofCols, proofWidth, proofHeight, windowWidth, windowHeight, x, 2, loadingSquareSize, extraHeight).template);
            }
        }

        // needs to be within scope of the code below
        let mcGroup = new GroupSource(settings, "mc").template;
        let lockGroup = new GroupSource(settings, "lock").template;
        // let proofGroup = new GroupSource("proof").template;

        for (var i = 1; i <= settings.instCount; i++) {
            this.template.scene_order.push({name:"Instance " + (i)});
            this.template.sources.push(new CaptureSource(settings.fullscreen, i).template);

            if (settings.switchMethod == "ASS") {
                this.template.modules["advanced-scene-switcher"].fileSwitches.push(new ASSSwitcher(settings.assPath, i).template);
            }

            wallScene.template.settings.items.push(new WSceneItem(settings, i, settings.locks).template);
            if (settings.locks) {
                mcGroup.settings.items.push(new WSceneItem(settings, i, false).template);

                this.template.sources.push(new LockSource(i, settings.multiPath, settings.instFormat).template);
                lockGroup.settings.items.push(new WSceneLock(settings, i, false).template);
                wallScene.template.settings.items.push(new WSceneLock(settings, i, true).template);
            }

            this.template.sources.push(new IScene(settings, i).template);
        }
        if (settings.switchMethod == "ASS") {
            this.template.modules["advanced-scene-switcher"].fileSwitches.push(new ASSSwitcher(settings.assPath, 0).template);
            this.template.modules["advanced-scene-switcher"].readPath = settings.assPath;
        }
        else {
            delete this.template.modules["advanced-scene-switcher"];
        }

        if (settings.locks)
        {
            this.template.groups.push(mcGroup);
            this.template.groups.push(lockGroup);

            wallScene.template.settings.items.push(new WSceneGroup(false).template);
            wallScene.template.settings.items.push(new WSceneGroup(true).template);
        }

        this.template.sources.push(wallScene.template);
        if (settings.proof == "scene") {
            this.template.sources.push(proofScene.template);
        }
    }
}

app.get("/wallDL", (req, res) => {
    let wall = new WallSceneCollection(req.query);
    console.log("Successfully generated wall scene with " + req.query.rows + " rows and " + req.query.cols + " columns.");

    var downloadPage = `
        <head>
            <link rel='stylesheet' href='./style.css'/>
        </head>
        <body width='100%' height='100%' style='display:flex; justify-content:center; align-items:center;'>
            Your download should have begun. If there are issues, please message draconix#6540
            <script type='text/javascript'>
                function download(content, filename, contentType) {
                    if (!contentType) contentType = "application/octet-stream";
                    var a = document.createElement("a");
                    var blob = new Blob([content], {"type":contentType});
                    a.href = window.URL.createObjectURL(blob);
                    a.download = filename;
                    a.click();
                }
                download(${JSON.stringify(JSON.stringify(wall.template))}, "${req.query.cols}x${req.query.rows} wall.json", "application/json")
            </script>
        </body>
    `;

    res.end(downloadPage);
});

app.use(express.static('public'));
const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log("Server is running on port " + port);
});

// for (i = 0; i < ids.users.length; i++) {
//     startHandlingEvents(ids.users[i]);
// }