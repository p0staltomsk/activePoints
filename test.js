describe("pow", function() {

    it("check dates format and convert", function() {
        assert.equal(formatedDate(1584552125000), "2020-03-19");
        assert.equal(formatedDateAndTime(1584552125000), "2020-03-19 00:22:05");
    });

    it("check work with lists navigation", function() {
        var obj = {
            "101": "first",
            "201": "second",
            "301": "anyelse",
            "401": "blablabla"
        };

        assert.equal(navObj(obj, "201", 1), "anyelse"); // next from "second"
        assert.equal(navPrevObj(obj, "201", 1), "first"); // previous from "second"
    });

    it("check sort & doubles cleaning", function() {
        var table = {
            1584552125000: {endDate: 1584552211000, startDate: 1584552125000, origStartDate: '2020-03-19 00:22:05', origEndDate: '2020-03-19 00:23:31', isFullAvtivity: false},
            1584552220000: {endDate: 1584552335000, startDate: 1584552220000, origStartDate: '2020-03-19 00:23:40', origEndDate: '2020-03-19 00:25:35', isFullAvtivity: false},
            1584553260000: {endDate: 1584553500000, startDate: 1584553260000, origStartDate: '2020-03-19 00:41:00', origEndDate: '2020-03-19 00:45:00', isFullAvtivity: true}
        },
        result = getBalancePoints(sortByDates(table), true),
        unitTest = assert.equal(result[1584553260000].diff, 240);
    });

    it("check how we working with time diapason", function() {
        var result = getEpisodeHours(1613555752000, 1613556075000);
        assert.deepEqual(result, [{hour: 16, day: '2021-02-17'}]);
    });

    it("check how we get atro hours for time diapason", function() {
        var result = getAstroHours(
            {origStartDate: '2021-2-17 16:55:52', origEndDate: '2021-2-17 17:1:15'},
            '2021-2-17 16:00:00',
            '2021-2-17 17:59:59',
            2
        );
        assert.deepEqual(result, [{hour: 16, day: '2021-02-17'}]);
    });

    it("check how we calc atro hours for time diapason", function() {
        var result = calcHours(1613552400000, 1613559599000);
        assert.deepEqual(result, 2);
    });

    it("check how calc balance points for episodes", function() {

        var resultWaitTwo = compareEpisodesInHour([
            ['2020-03-25 23:54:16'],
            ['2020-03-26 00:36:16'],
            ['2020-03-26 00:56:56']
        ]);

        assert.equal(resultWaitTwo, 2);

        var resultWaitOne = compareEpisodesInHour([
            ["2020-03-19 00:22:05"],
            ["2020-03-19 00:41:00"]
        ]);

        assert.equal(resultWaitOne, 1);
    });

});
