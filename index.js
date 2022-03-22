/* event when csv table upload */

document.getElementById('file-input').addEventListener('change', readSingleFile, false);

/* any const */
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
const $StepCountKey = 9;
const $dayKey = 15;
const $startDateKey = 12;
const $endDateKey = 13;

/* next key in obj table */
const navObj = (obj, currentKey, direction) => {return Object.values(obj)[Object.keys(obj).indexOf(currentKey) + direction];}
const navPrevObj = (obj, currentKey, direction) =>{return Object.values(obj)[Object.keys(obj).indexOf(currentKey) - direction];}

/* obj & arrays */

var $globalArrData = {};
var $BalancePointsByDays = {};

var $balancePointsResult = [];
var $balancePointsResultToSave = [];

/* methods */

/**
 * Read csv data for analyse and do result
 * @param e
 */
function readSingleFile(e) {

    /* performance start */
    console.log('start from:', performance.now());

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

        console.log($globalArrData);

        getBalancePoints($globalArrData); // sort table in chronology and get balance points

        console.log($BalancePointsByDays);

        calcBalancePoints($BalancePointsByDays);

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

    // console.log('cases', $caseIn);

    for (const [key, value] of Object.entries($caseIn)) {

        var episodes = getEpisodeHours(value.start, value.stop);

        // console.log('episodes', episodes);

        for (const [num, checkedEpisode] of Object.entries(episodes))
            registerPoints(data[key].data.day, parseInt(checkedEpisode), data[key].origStartDate);
    }
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
 * Analyse some episode for AH
 * @param element
 * @returns {Array}
 */
function getEpisodeHours(start, stop) {

    var astroHours = false,
        baseReturn = [],
        from = convertToFullDateAndTime(start),
        to = convertToFullDateAndTime(stop),
        startFrom = convertDate(from),
        stopTo = convertDate(to),
        astroHoursCnt = calcHours(
            new Date(startFrom[0][0] + "-" + startFrom[0][1] + "-" + startFrom[0][2] + " " + startFrom[1][0] + ":" + $firstTime + ":" + $firstTime).getTime(),
            new Date(stopTo[0][0] + "-" + stopTo[0][1] + "-" + stopTo[0][2] + " " + stopTo[1][0] + ":" + $lastTime + ":" + $lastTime).getTime()
        );

    baseReturn = [String(parseInt(startFrom[1][0]))];

    if (astroHoursCnt > 1) {

        baseReturn = getAstroHours(
            {
                "origStartDate": from,
                "origEndDate": to,
            },
            startFrom[0][0] + "-" + startFrom[0][1] + "-" + startFrom[0][2] + " " + startFrom[1][0] + ":" + $firstTime + ":" + $firstTime,
            stopTo[0][0] + "-" + stopTo[0][1] + "-" + stopTo[0][2] + " " + stopTo[1][0] + ":" + $lastTime + ":" + $lastTime,
            astroHoursCnt
        );
    }

    return baseReturn;
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

        hours.push(String(new Date(fstAH - $hourInMiliseconds).getHours()));
    }

    return hours;
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
 * Cut and diff range for episode
 * @param diff
 */
function cutEpisodeForTwoRanges(diff) {

    var range1 = getDate(diff[0][0][0] + "-" + diff[0][0][1] + "-" + diff[0][0][2] + " " + diff[0][1][0] + ":" + diff[0][1][1] + ":" + diff[0][1][2]);
    var range2 = getDate(diff[0][0][0] + "-" + diff[0][0][1] + "-" + diff[0][0][2] + " " + diff[0][1][0] + ":" + $lastTime + ":" + $lastTime) + $secondInMS; // + 1 last sec
    var range3 = getDate(diff[1][0][0] + "-" + diff[1][0][1] + "-" + diff[1][0][2] + " " + $firstTime + ":" + $firstTime + ":" + $firstTime);
    var range4 = getDate(diff[1][0][0] + "-" + diff[1][0][1] + "-" + diff[1][0][2] + " " + diff[1][1][0] + ":" + diff[1][1][1] + ":" + diff[1][1][2]);

    var result1 = ((range2 - range1) / $secondInMS); // интервал в конце часа
    var result2 = ((range4 - range3) / $secondInMS); // интервал в начале часа

    if (result1 >= $goodActivityEpisode)
        registerPoints(diff[0][0][0] + "-" + diff[0][0][1] + "-" + diff[0][0][2], 23);

    if (result2 >= $goodActivityEpisode)
        registerPoints(diff[1][0][0] + "-" + diff[1][0][1] + "-" + diff[1][0][2], 0);
}

/**
 * Check episode for activity in Astro Hour
 * @param date1
 * @param date2
 * @returns {boolean}
 */
function checkDatesForAstroHour(date1, date2) {

    var diff = [convertDate(date1), convertDate(date2)];

    if ( // проверяем простой ли это эпизод, и входит ли он в один день и час
    diff[0][0][0] == diff[1][0][0] &&
    diff[0][0][1] == diff[1][0][1] &&
    diff[0][0][2] == diff[1][0][2] &&
    diff[0][1][0] == diff[1][1][0] // in one Astro Hour
    ) return true;
    /*else
        cutEpisodeForTwoRanges(diff);*/ // todo если это не один час, то отправляем на анализ, что бы понять входит ли эпизод хотя бы в один час полноценно

    return false;
}

function checkChainsForDoubleBalancePoints(key, hour) { // $rangeActivityDoublePoints

    // console.log(key);
    // тут нужно проверить сколько всего в часе эпизодов, и сравнить интервалы между первым и последним
}

/**
 * Calc result balance points for days and save it into csv file
 * @param data
 */
function calcBalancePoints(data) {

    for (const [key, value] of Object.entries(data)) {

        var dateHour = key.split(" ");

        $balancePointsResult.push({
            "day": dateHour[0],
            "hour": dateHour[1],
            "points": value.value
        });
    }

    var pointsPerDay = {};

    $balancePointsResult.forEach((element, index) => {if(!pointsPerDay[element.day]) pointsPerDay[element.day] = 0; pointsPerDay[element.day]++;});

    for (const [key, value] of Object.entries(pointsPerDay)) {

        var hasNext = navObj(pointsPerDay, key, 1);

        var separator = '';

        if (hasNext != undefined)
            separator = ["\n"];

        var point = value;
        var percent = point * 10;

        $balancePointsResultToSave.push([key, point, percent + '.0'], separator);
    }

    console.log($balancePointsResultToSave);

    saveSingleFile([$balancePointsResultToSave]);
}

/**
 * Sort Data Table by timestamp keys
 * @param data
 * @returns {*}
 */
function sortByDates(data) {

    return Object.keys(data).sort().reduce((obj, key) => {obj[key] = data[key];return obj;},{});
}

/**
 * TODO get str split to and convert to timestamp
 * @param str
 * @returns {number}
 */
function getDate(str) {

    var myData = str.split(" ");

    var myDate = myData[0].split("-");
    var myTime = myData[1].split(":");

    return new Date(myDate[0], myDate[1], myDate[2], myTime[0], myTime[1], myTime[2]).getTime();
}

/**
 * Convert date to array
 * @param date
 * @returns {[null,null]}
 */
function convertDate(date) {

    var myData = date.split(" ");

    var myDate = myData[0].split("-");
    var myTime = myData[1].split(":");

    return [
        myDate,
        myTime
    ];
}

/**
 * TODO
 * @param timestamp
 * @returns {string}
 */
function convertToTime(timestamp) {

    var date = new Date(timestamp);

    return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

/**
 * TODO
 * @param timestamp
 * @returns {string}
 */
function convertToFullDateAndTime(timestamp) {

    var date = new Date(timestamp);

    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

/**
 * TODO
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

    /* performance end */
    console.log('stop at:', performance.now());
}

/* visualisation for tests & debug */

function displayContents(contents) {

    var element = document.getElementById('file-content');
    element.textContent = contents;
}
