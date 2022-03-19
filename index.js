/* event when csv table upload */

document.getElementById('file-input').addEventListener('change', readSingleFile, false);

/* any const */
const $device = 'Users’s Apple Watch';  // look only Apple Watch traks
const $secondInMS = 1000;               // 1 second = 1000 ms.
const $goodActivityEpisode = 180;       // 180 / 60 = 3 mins.
const $rangeActivityDoublePoints = 2280;// 2280 / 60 = 38 mins.
const $rangeActivityPause = 18;

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
            }
        }

        getBalancePoints(sortByDates(arrData)); // sort table in chronology and get balance points

        console.log($BalancePointsByDays);

        calcBalancePoints($BalancePointsByDays);

        var contents = e.target.result;

        displayContents(contents);
    };

    reader.readAsText(file);
}

/**
 * If have next part can glue
 * @param data
 * @param key
 * @returns {boolean}
 */
function isHasNextPart(data, key) {

    var timeDiff = (getDate(navObj(data, key, 1).origStartDate) - getDate(data[key].origEndDate)) / $secondInMS;

    if(timeDiff <= $rangeActivityPause)
        return true;

    return false;
}

function checkChainsForDoubleBalancePoints(data, key, hour) { // $rangeActivityDoublePoints

    var link = data[key].data.day+" "+String(hour);

    console.log(data[key].origStartDate, hour/*, $BalancePointsByDays[link]*/);

    // тут нужно проверить сколько всего в часе эпизодов, и сравнить интервалы между первым и последним
}

/**
 * registerPoints
 * @param key
 */
function registerPoints(key) {

    var point = 1;
    // var isDouble = checkChainsForDoubleBalancePoints(data, key, currentHour); // проверяем нет ли суперсвязок активности для зачисления 2 очков

    $BalancePointsByDays[key] = {"value": point};
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
            "hour":dateHour[1],
            "points":value.value
        });
    }

    var pointsPerDay = {};

    $balancePointsResult.forEach(

        (element, index) => {

            if(!pointsPerDay[element.day])
                pointsPerDay[element.day] = 0;

            pointsPerDay[element.day]++;
        }
    );

    for (const [key, value] of Object.entries(pointsPerDay)) {

        var hasNext = navObj(pointsPerDay, key, 1);

        var separator = '';

        if(hasNext != undefined)
            separator = ["\n"];

        var point = value;
        var percent = point * 10;

        $balancePointsResultToSave.push([key, point, percent + '.0'], separator);
    }

    saveSingleFile([$balancePointsResultToSave]);
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
                registerPoints(data[key].data.day+" "+String(currentHour));
        }
        else if(isHasNextPart(data, key) && (data[key].durationInSeconds + navObj(data, key, 1).durationInSeconds) >= $goodActivityEpisode) {

            $startDay = convertDate(data[key].origStartDate)[0][2];
            $endDay = convertDate(navObj(data, key, 1).origEndDate)[0][2];
            $startHour = convertDate(data[key].origStartDate)[1][0];
            $endHour = convertDate(navObj(data, key, 1).origEndDate)[1][0];

            if($startDay == $endDay && $startHour == $endHour)
                registerPoints(navObj(data, key, 1).data.day+" "+String($endHour));
        }
    }
}

/**
 * Cut and diff range for episode
 * @param diff
 */
function cutEpisodeForTwoRanges(diff) {

    console.log(diff);

    var range1 = getDate(diff[0][0][0]+"-"+diff[0][0][1]+"-"+diff[0][0][2]+" "+diff[0][1][0]+":"+diff[0][1][1]+":"+diff[0][1][2]);
    var range2 = getDate(diff[0][0][0]+"-"+diff[0][0][1]+"-"+diff[0][0][2]+" "+diff[0][1][0]+":"+$lastMinute+":"+$lastSecond) + $secondInMS; // + 1 last sec
    var range3 = getDate(diff[1][0][0]+"-"+diff[1][0][1]+"-"+diff[1][0][2]+" "+$firstMinute+":"+$firstMinute+":"+$firstMinute);
    var range4 = getDate(diff[1][0][0]+"-"+diff[1][0][1]+"-"+diff[1][0][2]+" "+diff[1][1][0]+":"+diff[1][1][1]+":"+diff[1][1][2]);

    var result1 = ((range2 - range1) / $secondInMS); // интервал в конце часа
    var result2 = ((range4 - range3) / $secondInMS); // интервал в начале часа

    if(result1 >= $goodActivityEpisode)
        registerPoints(diff[0][0][0]+"-"+diff[0][0][1]+"-"+diff[0][0][2]+" "+"23");

    if(result2 >= $goodActivityEpisode)
        registerPoints(diff[1][0][0]+"-"+diff[1][0][1]+"-"+diff[1][0][2]+" "+"00");
}

/**
 * Check episode in some hours
 * @param data
 * @param key
 * @returns {boolean}
 */
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
        cutEpisodeForTwoRanges(diff); // если это не один час, то отправляем на анализ, что бы понять входит ли эпизод хотя бы в один час полноценно

    return false;
}

/**
 * Sort Data Table by timestamp keys
 * @param data
 * @returns {*}
 */
function sortByDates(data) {

    // todo проверить - Object.entries(obj).sort((a, b) => a[0] - b[0]);

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
