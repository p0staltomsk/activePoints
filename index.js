/* events */

document.getElementById('file-input').addEventListener('change', readSingleFile, false);

/* methods */

function saveSingleFile(data) {

    let csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");

    var encodedUri = encodeURI(csvContent);
    var link = document.getElementById("result");

    link.setAttribute("href", encodedUri);
    link.innerHTML = "download mobile_test_output_example.csv";
    link.setAttribute("download", "mobile_test_output_example.csv");
}

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

            if(arrLine[12] != undefined && arrLine[13] != undefined) {

                var duration = (getDate(arrLine[13]) - getDate(arrLine[12])) / 1000;
                var isFullAvtivity = (duration >= 180); // const.

                arrData[getDate(arrLine[12])] = {
                    "data" : {
                        "sourceName" : arrLine[0],
                        "StepCount" : arrLine[9],
                        "day" : arrLine[15]
                    },
                    "endDate" : getDate(arrLine[13]),
                    "startDate" : getDate(arrLine[12]),
                    "durationInSeconds" : duration,
                    "isFullAvtivity" : isFullAvtivity
                };
            }
        }

        console.log(arrData);

        var contents = e.target.result;

        displayContents(contents);
    };

    reader.readAsText(file);

    // generate link for download results file
    saveSingleFile(
        [
            // demo output array
            ["day","balance_points","balance_day"],
            ["2020-03-17",10,100],
            ["2020-03-18",5,50],
            ["2020-03-19",12,120],
            ["2020-03-20",7,70]
        ]
    );
}

function getDate(str) {

    var myData = str.split(" ");

    var myDate = myData[0].split("-");
    var myTime = myData[1].split(":");

    return new Date(myDate[0], myDate[1], myDate[2], myTime[0], myTime[1], myTime[2]).getTime();
}

function displayContents(contents) {

    var element = document.getElementById('file-content');
    element.textContent = contents;
}
