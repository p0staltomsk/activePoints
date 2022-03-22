/* event when csv table upload */

document.getElementById('file-input').addEventListener('change', readSingleFile, false);

/* any const */
const $ver = '0.1';                     // beta ver
const $device = 'Users’s Apple Watch';  // look only Apple Watch traks
const $secondInMS = 1000;               // 1 second = 1000 ms.
const $goodActivityEpisode = 180;       // 180 / 60 = 3 mins.
const $rangeActivityDoublePoints = 2280;// 2280 / 60 = 38 mins.
const $rangeActivityPause = 18;
const $hourInMiliseconds = 3600000;

/* for time calcs */
const $lastTime = '59';
const $firstTime = '00';

/* keys const */
const $sourceNameKey = 0;
const $dayKey = 15;
const $startDateKey = 12;
const $endDateKey = 13;
const $percentsPerPoint = 10;

/* next key in obj table */
const navObj = (obj, currentKey, direction) => {return Object.values(obj)[Object.keys(obj).indexOf(currentKey) + direction];}
const navPrevObj = (obj, currentKey, direction) =>{return Object.values(obj)[Object.keys(obj).indexOf(currentKey) - direction];}

/* obj & arrays */

var $globalArrData = {};
var $BalancePointsByDays = {};

var $balancePointsResult = [];

/* methods */

/**
 * Read csv data for analyse and do result
 * @param e
 */
function readSingleFile(e) {

    /* performance start */
    console.log('readSingleFile from', performance.now());

    var file = e.target.files[0];

    if (!file) {
        return;
    }

    var reader = new FileReader();
    var arrData = {};

    reader.onload = function (e) {

        var lines = e.target.result.split(/[\r\n]+/g); // tolerate both Windows and Unix linebreaks

        /* read csv file and put data in array */
        for (var i = 0; i < lines.length; i++) {

            var arrLine = lines[i].split(',');

            if (arrLine[$startDateKey] != undefined && arrLine[$endDateKey] != undefined && arrLine[$sourceNameKey] == $device) {

                var duration = (getDate(arrLine[$endDateKey]) - getDate(arrLine[$startDateKey])) / $secondInMS;
                var isFullAvtivity = (duration >= $goodActivityEpisode);

                arrData[getDate(arrLine[$startDateKey])] = { // timestamp in array keys for sort table in chronology
                    "data": {
                        "sourceName": arrLine[$sourceNameKey],
                        "day": arrLine[$dayKey]
                    },
                    "endDate": getDate(arrLine[$endDateKey]),
                    "startDate": getDate(arrLine[$startDateKey]),
                    "origStartDate": arrLine[$startDateKey],
                    "origEndDate": arrLine[$endDateKey],
                    "durationInSeconds": duration,
                    "isFullAvtivity": isFullAvtivity
                };
            }
        }

        $globalArrData = sortByDates(arrData);

        // console.log($globalArrData);

        /* performance start */
        console.log('readSingleFile end', performance.now());

        getBalancePoints($globalArrData); // sort table in chronology and get balance points

        // console.log($BalancePointsByDays);

        calcBalancePoints($BalancePointsByDays);

        /* performance start */
        console.log('calcBalancePoints end', performance.now());

        var contents = e.target.result;

        displayContents(contents);
    };

    reader.readAsText(file);
}

/**
 * Clean first, next Check data for some activity
 * @param data
 */
function getBalancePoints(data) {

    var $caseIn = {}, glueStart = 0, glueStop = 0;

    for (const [key, value] of Object.entries(data)) {

        var nextKey = navObj(data, key, 1),
            prevKey = navPrevObj(data, key, 1),
            endDate = isHasNextParts(String(key), nextKey);

        if (endDate > 0) {

            if (glueStart == 0)
                glueStart = parseInt(key);

            glueStop = endDate;

        } else {

            if (glueStart != 0 && glueStop != 0) {

                if (getDiffTwoTimestamps(glueStop, glueStart) >= $goodActivityEpisode)
                    $caseIn[glueStart] = {
                        "start": glueStart,
                        "stop": glueStop,
                        "diff": getDiffTwoTimestamps(glueStop, glueStart)
                    };

                glueStart = 0, glueStop = 0;
            }

            if (!endDate && value.isFullAvtivity && value.endDate != isHasNextParts(String(prevKey.startDate)))
                $caseIn[parseInt(key)] = {
                    "start": parseInt(key),
                    "stop": value.endDate,
                    "diff": getDiffTwoTimestamps(value.endDate, parseInt(key))
                };
        }
    }

    for (const [key, value] of Object.entries($caseIn))
        for (const [num, checkedEpisode] of Object.entries(getEpisodeHours(value.start, value.stop)))
            registerPoints(checkedEpisode.day, parseInt(checkedEpisode.hour), data[key].origStartDate);
}

/**
 * TODO DOCS
 * @param key
 * @returns {*}
 */
function isHasNextParts(key, nextKey) {

    var next = null;

    if (nextKey == undefined)
        next = navObj($globalArrData, key, 1);
    else
        next = nextKey;

    if (next == undefined)
        return null;
    else {

        if ((((getDate(next.origStartDate) - getDate($globalArrData[key].origEndDate)) / $secondInMS) <= $rangeActivityPause))
            return next.endDate;
    }

    return false;
}

/**
 * Analyse some episode for Astro Hour
 * @param element
 * @returns {Array}
 */
function getEpisodeHours(start, stop) {

    var baseReturn = [],
        from = convertToFullDateAndTime(start),
        to = convertToFullDateAndTime(stop),
        startFrom = convertDate(from),
        stopTo = convertDate(to),
        astroHoursCnt = calcHours(
            new Date(startFrom[0][0] + "-" + startFrom[0][1] + "-" + startFrom[0][2] + " " + startFrom[1][0] + ":" + $firstTime + ":" + $firstTime).getTime(),
            new Date(stopTo[0][0] + "-" + stopTo[0][1] + "-" + stopTo[0][2] + " " + stopTo[1][0] + ":" + $lastTime + ":" + $lastTime).getTime()
        );

    if (astroHoursCnt > 1) {

        baseReturn = getAstroHours(
            {
                "origStartDate": from,
                "origEndDate": to
            },
            startFrom[0][0] + "-" + startFrom[0][1] + "-" + startFrom[0][2] + " " + startFrom[1][0] + ":" + $firstTime + ":" + $firstTime,
            stopTo[0][0] + "-" + stopTo[0][1] + "-" + stopTo[0][2] + " " + stopTo[1][0] + ":" + $lastTime + ":" + $lastTime,
            astroHoursCnt
        );
    } else
        baseReturn.push({"hour": parseInt(startFrom[1][0]), "day": formatedDate(startFrom[0][0] + "-" + startFrom[0][1] + "-" + startFrom[0][2])});

    return baseReturn;
}

/**
 * Look for every hour in episode todo look for code optimization
 * @param episode
 * @param start
 * @param finish
 * @param astroHours
 * @returns {Array}
 */
function getAstroHours(episode, start, finish, astroHours) {

    var hours = [];

    var fstAH = getDate(start); // таймстампы первого астрочаса
    var secAH = getDate(finish); // таймстампы последнего астрочаса

    var fstPart = (fstAH + $hourInMiliseconds - getDate(episode.origStartDate)); // милисекунды первой части
    var secPart = (getDate(episode.origEndDate) - secAH + $hourInMiliseconds - $secondInMS); // милисекунды второй части

    for (var i = 0; i < astroHours; i++) {

        fstAH = fstAH + $hourInMiliseconds;

        if (i == 0 && (fstPart / $secondInMS) < $goodActivityEpisode || parseInt(i) == parseInt(astroHours - 1) && (secPart / $secondInMS) < $goodActivityEpisode)
            continue;

        var returnTime = new Date(fstAH - $hourInMiliseconds),
            eventDay = formatedDate(fstAH - $hourInMiliseconds) // returnTime.getFullYear() + "-" + returnTime.getMonth() + "-" + returnTime.getDate();

        hours.push({"hour": returnTime.getHours(), "day": eventDay});
    }

    return hours;
}

/**
 * Calc Astro Hours for episode
 * @param start
 * @param finish
 * @returns {number}
 */
function calcHours(start, finish) {

    return Math.ceil((finish - start) / $hourInMiliseconds);
}

/**
 * Get 2 time diff in secs
 * @param time1
 * @param time2
 * @returns {number}
 */
function getDiffTwoTimestamps(time1, time2) {

    return (time1 - time2) / $secondInMS;
}

/**
 * registerPoints
 * @param key
 */
function registerPoints(key, hour, some) {

    if ($BalancePointsByDays[key] == undefined)
        $BalancePointsByDays[key] = [];

    if ($BalancePointsByDays[key][parseInt(hour)] == undefined)
        $BalancePointsByDays[key][parseInt(hour)] = [];

    $BalancePointsByDays[key][parseInt(hour)].push([some]);
}

/**
 * Calc result balance points for days and save it into csv file
 * @param data
 */
function calcBalancePoints(data) {

    var pointsPerDay = {};

    for (const [activeDay, activeHours] of Object.entries(data)) {

        if(pointsPerDay[activeDay] == undefined)
            pointsPerDay[activeDay] = {};

        for (const [hour, startDates] of Object.entries(activeHours)) {

            if(pointsPerDay[activeDay][hour] == undefined)
                pointsPerDay[activeDay][hour] = 0;

            pointsPerDay[activeDay][hour] = (startDates.length == 1) ? 1 : compareEpisodesInHour(startDates);
        }
    }

    // console.log('PPD', pointsPerDay);

    for (const [day, hours] of Object.entries(pointsPerDay)) {

        var hasNext = navObj(pointsPerDay, day, 1),
            separator = '',
            point = 0,
            percent = 0;

        if (hasNext != undefined)
            separator = ["\n"];

        for (const [hour, points] of Object.entries(hours)) {
            point = point + points;
            percent = point * $percentsPerPoint;
        }

        $balancePointsResult.push([day, point, percent + '.0'], separator);
    }

    console.log($balancePointsResult); // todo debug & tests

    saveSingleFile([$balancePointsResult]);
}

/**
 * Check episode and give points todo think about return val
 * @param data
 * @returns {number}
 */
function compareEpisodesInHour(data) {

    var start = data[0],
        stop = data[data.length - 1],
        arrStart = convertDate(start[0]),
        arrStop = convertDate(stop[0]);

    if (arrStart[0][2] == arrStop[0][2]) {

        if(((getDate(stop[0]) - getDate(start[0]))) / $secondInMS < $rangeActivityDoublePoints)
            return 1;

    } else {

        if(((getDate(stop[0]) - getDate(arrStop[0][0] + "-" + arrStop[0][1] + "-" + arrStop[0][2] + " " + arrStop[1][0] + ":" + $firstTime + ":" + $firstTime))) / $secondInMS < $rangeActivityDoublePoints)
            return 1;
    }

    return 2;
}

/**
 * Sort Data Table by timestamp keys
 * @param data
 * @returns {*}
 */
function sortByDates(data) {

    return Object.keys(data).sort().reduce((obj, key) => {obj[key] = data[key]; return obj;},{});
}

/**
 * Get date timestamp
 * @param str
 * @returns {number}
 */
function getDate(str) {

    return new Date(str).getTime();
}

/**
 * Convert date to array
 * @param date
 * @returns {[null,null]}
 */
function convertDate(date) {

    var Date = date.split(" "),
        returnDate = Date[0].split("-"),
        returnTime = Date[1].split(":");

    return [
        returnDate,
        returnTime
    ];
}

/**
 * TODO DOCS
 * @param timestamp
 * @returns {string}
 */
function convertToFullDateAndTime(timestamp) {

    var date = new Date(timestamp);

    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

/**
 * Beautiful date format
 * @param date
 * @returns {string}
 */
function formatedDate(date) {

    var d = new Date(date),
        month = '' + (d.getMonth() + 2),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;

    return [year, month, day].join('-');
}

/**
 * TODO DOCS
 * Save result in csv file for download
 * @param data
 */
function saveSingleFile(data) {

    let csvContent = "data:text/csv;charset=utf-8,day,balance_points,balance_day\n" + data.map(e => e.join("")).join("\n");

    var encodedUri = encodeURI(csvContent);
    var link = document.getElementById("result-link");

    link.setAttribute("href", encodedUri);
    link.innerHTML = "download mobile_test_output_example.csv";
    link.setAttribute("download", "mobile_test_output_example.csv");
}

/* visualisation for tests & debug */

function displayContents(contents) {

    var element = document.getElementById('file-content');
    element.textContent = contents;
}
