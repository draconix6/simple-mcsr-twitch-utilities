const fs = require('fs');
const axios = require('axios');
const express = require('express');
const app = express();

// wall scene maker

class Template {
    constructor(templateSource) {
        this.template = JSON.parse(fs.readFileSync(templateSource));
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
    constructor(instNum, lockPath) {
        super("./templates/lockTemplate.json");
        this.template.name = "lock " + instNum;
        if (lockPath) {
            this.template.settings.file = lockPath;
        }
    }
}

class AudioSource extends Template {
    constructor(instNum) {
        super(`./templates/audioCaptureTemplate.json`);
        this.template.name = "audio " + instNum;
        this.template.settings.window = "Minecraft* - Instance " + instNum + ":GLFW30:javaw.exe";
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
    constructor(instNum, x, y, width, height, windowWidth, windowHeight, crop = 0, loadingSquareSize = 0, extraHeight = 0) {
        super("./templates/wallSceneItemTemplate.json");
        this.template.name = "verification " + instNum;
        this.template.id = instNum;

        switch (crop) {
            case 0:
                this.template.bounds.x = width - height; // 2 * height for old WP
                this.template.bounds.y = height;
                this.template.pos.x = x;
                this.template.pos.y = y;
                break;
            case 1:
                this.template.bounds.x = height;
                this.template.bounds.y = height;
                this.template.pos.x = x + (width - height);
                this.template.pos.y = y;
                this.template.crop_top = windowHeight - extraHeight - loadingSquareSize;
                this.template.crop_right = windowWidth - loadingSquareSize;
                this.template.scale_filter = "point";
                break;
        }
    }
}

class ASceneItem extends Template {
    constructor(instNum, groupItem) {
        super("./templates/audioSceneItemTemplate.json");
        this.template.name = "audio " + instNum;
        this.template.id = instNum;
        if (groupItem)
        {
            this.template.group_item_backup = true;
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
        else if (settings.switchMethod == "C") {
            delete this.template.hotkeys["OBSBasic.SelectScene"];
        }
        this.template.name = "Instance " + instNum;
        this.template.settings.items[0].name = "mc " + instNum;
        // for (var i = 0; i < 2; i++) {
            this.template.settings.items[0].bounds.x = settings.screenWidth;
            this.template.settings.items[0].bounds.y = settings.screenHeight;
        // }
        // if (settings.proof == "corner") {
        //     var yOffset = 0;
        //     for (var i = 1; i <= settings.instCount; i++) {
        //         if (i != instNum) {
        //             // this.template.settings.items.splice(1, 0, new WSceneItem(settings, i, false, true, yOffset).template);
        //             // add instance scene proof
        //             this.template.bounds.x = settings.screenWidth / 6;
        //             this.template.bounds.y = settings.screenHeight / (2 * settings.instCount); // 2 here is the amount of screen the instances will take up
        //             this.template.pos.x = settings.screenWidth - this.template.bounds.x;
        //             this.template.pos.y = settings.screenHeight - this.template.bounds.y * (instNum - yOffset);
                    
        //             let row = Math.floor((instNum - 1) / proofCols);
        //             let col = Math.floor((instNum - 1) % proofCols);
        //             proofScene.template.settings.items.push(new PSceneItem(i, col * width, row * height, proofHeight, windowWidth, windowHeight, x).template);
        //             proofScene.template.settings.items.push(new PSceneItem(i, col * width, row * height, proofWidth, proofHeight, windowWidth, windowHeight, x, 1, loadingSquareSize, extraHeight).template);
        //         }
        //         if (i == instNum) {
        //             yOffset = 1;
        //         }
        //     }
        //     // this.template.settings.items[1].id = settings.instCount + 1; // settings.instCount + 1
        // }
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
            this.template.locked = false;
        }
    }
}

class GroupSource extends Template {
    constructor(settings, type) {
        super("./templates/groupTemplate.json");
        this.template.name = type + " group";
        this.template.settings.cx = settings.screenWidth;
        this.template.settings.cy = settings.screenHeight;
    }
}

class WSceneGroup extends Template {
    constructor(type) {
        super("./templates/wallSceneItemTemplate.json");
        this.template.name = type + " group";
        this.template.bounds.x = 0;
        this.template.bounds.y = 0;
        this.template.bounds_type = 0;
        if (type == "audio") {
            this.template.visible = false;
        }
    }
}

class WScene extends Template {
    constructor(switchMethod) {
        super("./templates/wallSceneTemplate.json");
        if (switchMethod == "C") {
            delete this.template.hotkeys["OBSBasic.SelectScene"];
        }
    }
}

class WallSceneCollection extends Template
{
    constructor(settings) {
        super("./templates/collectionTemplate.json");

        console.log(settings);

        // create extra settings
        settings.instCount = settings.rows * settings.cols;

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
            if (settings.screenWidth == 0) {
                settings.screenWidth = settings.screenHeight * (16 / 9);
            }
            if (settings.screenHeight == 0) {
                settings.screenHeight = settings.screenWidth / (16 / 9);
            }
        }

        settings.wallItemWidth = Math.floor(settings.screenWidth / settings.cols);
        settings.wallItemHeight = Math.floor(settings.screenHeight / settings.rows);

        if (settings.locks) {
            settings.lockPath = settings.lockPath.replace(/\\/g,"/");
            if (settings.switchMethod == "C") {
                settings.multiPath = "";
                settings.instFormat = "";
            }
            else {
                settings.multiPath = settings.multiPath.replace(/\\/g,"/");
                settings.lockPath = "";
            }
           
        }

        // create groups
        // needs to be within scope of the code below
        let mcGroup = new GroupSource(settings, "mc").template;
        let lockGroup = new GroupSource(settings, "lock").template;
        let audioGroup = new GroupSource(settings, "audio").template;
        let mapGroup = new GroupSource(settings, "lock").template;
        let percentGroup = new GroupSource(settings, "lock").template;
        let pausedGroup = new GroupSource(settings, "lock").template;
        // let proofGroup = new GroupSource("proof").template;

        // init wall scene
        this.template.name = settings.cols + "x" + settings.rows + " wall";
        let wallScene = new WScene(settings.switchMethod);

        // init proof numbers
        let x = 1;
        var windowWidth;
        var windowHeight;
        var proofWidth;
        var proofHeight;
        var proofRows;
        var proofCols;
        var loadingSquareSize;
        var extraHeight;
        if (settings.proof != "false") {
            var proofScene = new WScene(settings.switchMethod);
            proofScene.template.name = "Verification";
            if (settings.proofProfile == "default") {
                windowWidth = settings.proofWidth;
                windowHeight = settings.proofHeight;
                if (settings.widthMultiplier != 0) {
                    windowHeight = Math.floor(windowHeight / settings.widthMultiplier);
                }
                else if (!settings.borderless) {
                    windowWidth += 16;
                    windowHeight -= 24;
                }
            }
            else {
                windowWidth = settings.proofWidthUnstretched;
                windowHeight = settings.proofHeightUnstretched;
            }

            // new proof recording crops setup - credits to duncan
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
            // 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
            // ---END OF STRUCTURAL INTEGRITY DUCKS---

            proofRows = Math.floor(Math.sqrt(settings.instCount)) - 1;
            proofCols = 0;
            var sizeRatio = 0;

            do {
                proofRows += 1;
                proofCols = Math.ceil(settings.instCount / proofRows);
                sizeRatio = Math.floor(settings.screenWidth / proofCols) / Math.floor(settings.screenHeight / proofRows);
            } while (proofCols != 1 && sizeRatio < 3.5);
            console.log((proofRows * proofCols - settings.instCount) / (proofRows * proofCols));
            while ((proofRows * proofCols - settings.instCount) / (proofRows * proofCols) > 0.2) {
                proofRows += 1;
            }
            console.log(proofRows + " " + proofCols);

            proofWidth = Math.floor(settings.screenWidth / proofCols);
            proofHeight = Math.floor(settings.screenHeight / proofRows);

            // does not account for forceUnicodeFont option being true
            // in which case an odd number GUI scale must increment by 1
            // idk if it's too worth
            while (x != settings.guiScale && x < windowWidth && x < windowHeight && windowWidth / (x + 1) >= 320 && windowHeight / (x + 1) >= 240) {
                x++;
            }

            // square is 90x90
            // extraHeight pertains to height needed to capture loading % above square - 19px
            loadingSquareSize = x * 90;
            extraHeight = x * 19;
        }
        if (settings.proof == "scene")
        {
            // add proof scene item
            for (var i = 1; i <= settings.instCount; i++) {
                let row = Math.floor((i - 1) / proofCols);
                let col = Math.floor((i - 1) % proofCols);
                proofScene.template.settings.items.push(new PSceneItem(i, col * proofWidth, row * proofHeight, proofWidth, proofHeight, windowWidth, windowHeight).template);
                proofScene.template.settings.items.push(new PSceneItem(i, col * proofWidth, row * proofHeight, proofWidth, proofHeight, windowWidth, windowHeight, 1, loadingSquareSize, extraHeight).template);
            }
        }

        // main loop
        for (var i = 1; i <= settings.instCount; i++) {
            // add proof capture source
            if (settings.proof != "false") {
                let proofSource = new CaptureSource(false, i);
                proofSource.template.name = "verification " + i;
                this.template.sources.push(proofSource.template);
            }

            // add instance scene + game/window capture
            this.template.scene_order.push({name:"Instance " + (i)});
            this.template.sources.push(new CaptureSource(settings.fullscreen, i).template);

            // add instance wall scene item
            wallScene.template.settings.items.push(new WSceneItem(settings, i, settings.locks).template);
            if (settings.locks) {
                // add instance to group
                mcGroup.settings.items.push(new WSceneItem(settings, i, false).template);

                // add lock path
                var lockPath = settings.switchMethod == "C" ? settings.lockPath :
                settings.multiPath + "/instances/" + settings.instFormat.replace("*", i) + "/.minecraft/lock.png";
                // add lock source, scene item & add to group
                this.template.sources.push(new LockSource(i, lockPath).template);
                lockGroup.settings.items.push(new WSceneLock(settings, i, false).template);
                wallScene.template.settings.items.push(new WSceneLock(settings, i, true).template);
            }

            // add instance scene & proof recording sources if applicable
            let iScene = new IScene(settings, i);
            if (settings.proof == "corner") {
                var yOffset = 0;
                for (var j = 1; j <= settings.instCount; j++) {
                    if (j != i) {
                        // this.template.settings.items.splice(1, 0, new WSceneItem(settings, i, false, true, yOffset).template);
                        // add instance scene proof
                        let row = Math.floor((j - 1) / proofCols);
                        let col = Math.floor((j - 1) % proofCols);
                        var iProofMain = new PSceneItem(j, col * proofWidth, row * proofHeight, proofWidth, proofHeight, windowWidth, windowHeight);
                        var iProofLoading = new PSceneItem(j, col * proofWidth, row * proofHeight, proofWidth, proofHeight, windowWidth, windowHeight, 1, loadingSquareSize, extraHeight);

                        // adjust for corner
                        iProofMain.template.bounds.x = settings.screenWidth / 7;
                        iProofMain.template.bounds.y = settings.screenHeight / (1.5 * settings.instCount); // 1 here is the amount of screen the instances will take up (1/x)
                        
                        iProofLoading.template.bounds.x = iProofMain.template.bounds.y;
                        iProofLoading.template.bounds.y = iProofMain.template.bounds.y;
                        iProofLoading.template.pos.x = settings.screenWidth - iProofLoading.template.bounds.x;
                        iProofLoading.template.pos.y = settings.screenHeight - iProofLoading.template.bounds.y * (j - yOffset);
                        
                        iProofMain.template.pos.x = settings.screenWidth - iProofMain.template.bounds.x - iProofLoading.template.bounds.x;
                        iProofMain.template.pos.y = settings.screenHeight - iProofMain.template.bounds.y * (j - yOffset);
                        
                        iScene.template.settings.items.push(iProofMain.template);
                        iScene.template.settings.items.push(iProofLoading.template);
                    }
                    if (j == i) {
                        yOffset = 1;
                    }
                }
            }
            this.template.sources.push(iScene.template);

            // add audio source
            this.template.sources.push(new AudioSource(i).template);
            this.template.sources[0].settings.items.push(new ASceneItem(i, true).template);
            audioGroup.settings.items.push(new ASceneItem(i, false).template);
        }

        // add groups
        if (settings.locks) {
            this.template.groups.push(mcGroup);
            this.template.groups.push(lockGroup);

            wallScene.template.settings.items.push(new WSceneGroup("mc").template);
            wallScene.template.settings.items.push(new WSceneGroup("lock").template);
        }
        this.template.groups.push(audioGroup);
        this.template.sources[0].settings.items.push(new WSceneGroup("audio").template);

        if (settings.cropToggle) {

        }

        // push wall & proof scenes
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
        <body width='100%' height='100%' style='display:flex; flex-direction:column; justify-content:center; align-items:center;'>
            <p>Your download should have begun. If there are issues, please message draconix#6540.</p>
            <p>The downloaded file should be dragged into OBS > Scene Collection > Import.</p>
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