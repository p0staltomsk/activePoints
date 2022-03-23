describe("pow", function() {

    it("проверяем форматы дат", function() {
        assert.equal(formatedDate(1584552125000), "2020-03-19");
        assert.equal(formatedDateAndTime(1584552125000), "2020-03-19 00:22:05");
    });

    // assert.equal(formatedDate(1647796201000), "2022-03-21");
    // assert.equal(convertToFullDateAndTime(1584552125000), "2020-03-19 00:22:05");

    // assert.equal(getDate("2020-03-19 00:22:05"), 1584552125000);

});
