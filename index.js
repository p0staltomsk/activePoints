/* event when csv table upload */

document.getElementById('file-input').addEventListener('change', readSingleFile, false);

/* any const */
const $device = 'Users’s Apple Watch';  // look only Apple Watch traks
const $secondInMS = 1000;               // 1 second = 1000 ms.
const $goodActivityEpisode = 180;       // 180 / 60 = 3 mins.
const $rangeActivityPoints = 2280;      // 2280 / 60 = 38 mins.

/* for time calcs */
const $lastMinute = '59';
const $lastSecond = '59';
const $firstMinute = '00';
const $firstSecond = '00';

/* keys const */
const $sourceNameKey = 0;
const $StepCountKey = 9;
const $dayKey = 15;
const $startDateKey = 12;
const $endDateKey = 13;

/* next key in obj table */
const navObj = (obj, currentKey, direction) => {return Object.values(obj)[Object.keys(obj).indexOf(currentKey) + direction];};

/* obj & arrays */
var $BalancePointsByDays = {};
var $balancePointsResult = [];
var $balancePointsResultToSave = [];

/* methods */

/**
 * Read csv data for analyse and do result
 * @param e
 */
function readSingleFile(e) {

    var file = e.target.files[0];

    if (!file) {
        return;
    }

    var reader = new FileReader();
    var arrData = {};

    reader.onload = function (e) {

        var lines = e.target.result.split(/[\r\n]+/g); // tolerate both Windows and Unix linebreaks

        for(var i = 0; i < lines.length; i++) {

            var arrLine = lines[i].split(',');

            if(arrLine[$startDateKey] != undefined && arrLine[$endDateKey] != undefined && arrLine[$sourceNameKey] == $device) {

                var duration = (getDate(arrLine[$endDateKey]) - getDate(arrLine[$startDateKey])) / $secondInMS;
                var isFullAvtivity = (duration >= $goodActivityEpisode);

                arrData[getDate(arrLine[$startDateKey])] = { // timestamp in array keys for sort table in chronology
                    "data" : {
                        "sourceName" : arrLine[$sourceNameKey],
                        "StepCount" : arrLine[$StepCountKey],
                        "day" : arrLine[$dayKey]
                    },
                    "endDate" : getDate(arrLine[$endDateKey]),
                    "startDate" : getDate(arrLine[$startDateKey]),
                    "origStartDate" : arrLine[$startDateKey],
                    "origEndDate" : arrLine[$endDateKey],
                    "durationInSeconds" : duration,
                    "isFullAvtivity" : isFullAvtivity
                };

            }/* else {

                console.log(arrLine);
            }*/
        }

        getBalancePoints(sortByDates(arrData));// sort table in chronology and get balance points

        calcBalancePoints($BalancePointsByDays);

        var contents = e.target.result;

        displayContents(contents);
    };

    reader.readAsText(file);
}

/**
 * Check data for balance activity
 * @param data
 */
function getBalancePoints(data) {

    for (const [key, value] of Object.entries(data)) {

        if(value.durationInSeconds >= $goodActivityEpisode) {

            var currentHour = convertDate(data[key].origStartDate)[1][0];

            if(isPartInAstroHour(data, key))
                $BalancePointsByDays[data[key].data.day+" "+String(currentHour)] = {"value": 1};
        }
        else
            isHasNextPart(data, key);
    }
}

function isHasNextPart(data, key) {

    // проверяем можно ли склеить два эпизода что бы засчитать активность
    // console.log(data[key], navObj(data, key, 1));
}

function isPartInAstroHour(data, key) {

    return checkDatesForAstroHour(data[key].origStartDate, data[key].origEndDate);
}

/**
 * Check episode for activity in Astro Hour
 * @param date1
 * @param date2
 * @returns {boolean}
 */
function checkDatesForAstroHour(date1, date2) {

    var diff = [convertDate(date1), convertDate(date2)];

    if(
        diff[0][0][0] == diff[1][0][0] &&
        diff[0][0][1] == diff[1][0][1] &&
        diff[0][0][2] == diff[1][0][2] &&
        diff[0][1][0] == diff[1][1][0] // in one Astro Hour
    ) return true;
    else
        cutEpisodeForTwoRanges(diff);

    return false;
}

function cutEpisodeForTwoRanges(diff) {

    // todo use - getDate()
    var range1 = new Date(diff[0][0][0], diff[0][0][1], diff[0][0][2], diff[0][1][0], diff[0][1][1], diff[0][1][2]).getTime();
    var range2 = new Date(diff[0][0][0], diff[0][0][1], diff[0][0][2], diff[0][1][0], $lastMinute, $lastSecond).getTime() + $secondInMS; // + 1 sec
    var range3 = new Date(diff[1][0][0], diff[1][0][1], diff[1][0][2], $firstMinute, $firstMinute, $firstMinute).getTime();
    var range4 = new Date(diff[1][0][0], diff[1][0][1], diff[1][0][2], diff[1][1][0], diff[1][1][1], diff[1][1][2]).getTime();

    var result1 = ((range2 - range1) / $secondInMS);
    var result2 = ((range4 - range3) / $secondInMS);

    if(result1 >= $goodActivityEpisode)
        $BalancePointsByDays[diff[0][0][0]+"-"+diff[0][0][1]+"-"+diff[0][0][2]+" "+"23"] = {"value": 1};
    if(result2 >= $goodActivityEpisode)
        $BalancePointsByDays[diff[1][0][0]+"-"+diff[1][0][1]+"-"+diff[1][0][2]+" "+"00"] = {"value": 1};
}

function checkChainsForDoubleBalancePoints(data) {

    // проверяем цепочки эпизодов, на двойную активность
}

function calcBalancePoints(data) {

    for (const [key, value] of Object.entries(data)) {

        var dateHour = key.split(" ");

        $balancePointsResult.push({
            "day": dateHour[0],
            "hour":dateHour[1],
            "points":value.value
        });
    }

    $balancePointsResult.forEach(

        (element, index) => {

            var separator = '';
            if($balancePointsResult.length > index + 1)
                separator = ["\n"];

            var point = 1; // todo
            var percent = point * 10; // todo

            $balancePointsResultToSave.push([element.day,point,percent+'.0'],separator);
        }
    );

    /*console.log($balancePointsResult);
    console.log($balancePointsResultToSave);*/

    saveSingleFile([$balancePointsResultToSave]);
}

/**
 * Sort Data Table by timestamp keys
 * @param data
 * @returns {*}
 */
function sortByDates(data) {

    return arrDataSorted = Object.keys(data).sort().reduce(
        (obj, key) => {
            obj[key] = data[key];
            return obj;
        },
        {}
    );
}

/**
 * Date Format: 2020-03-21 00:14:33
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
 * Cpvert date to array
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
 * Save result in csv file for download
 * @param data
 */
function saveSingleFile(data) {

    let csvContent = "data:text/csv;charset=utf-8,day,balance_points,balance_day\n" + data.map(e => e.join("")).join("\n");

    // console.log(csvContent);

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
