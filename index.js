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

    reader.onload = function (e) {
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

function displayContents(contents) {

    var element = document.getElementById('file-content');
    element.textContent = contents;
}
