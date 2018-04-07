(function() {
  "use strict";
  var reader = new FileReader();
  function commonValidator(p, evt) {
    var res = p.responses;
    if (~evt.indexOf("T")) {
      if (p.responses.length === 2) {
        if (res[0].Code == 3) {
          return abnValidator(p, evt, res[1]);
        }
        if (res[1].Code == 3) {
          return abnValidator(p, evt, res[0]);
        }
      }
    } else if (res.length === 1) {
      return abnValidator(p, evt, res[0]);
    }
  }
  function abnValidator(p, evt, res) {
    if (~evt.indexOf("N")) {
      if (res.Code == 2) {
        return res;
      }
    } else {
      if (res.Code == 1) {
        return res;
      }
    }
  }
  var app = new Vue({
    el: "#app",
    data: {
      tab: "source",
      log: {
        time: "",
        keys: [],
        data: []
      },
      pictures: [],
      result: [
        {
          key: "NT",
          data: [],
          totalTimeDiff: 0,
          successCount: 0,
          total: 40
        },
        {
          key: "ND",
          data: [],
          totalTimeDiff: 0,
          successCount: 0,
          total: 40
        },
        {
          key: "AT",
          data: [],
          totalTimeDiff: 0,
          successCount: 0,
          total: 40
        },
        {
          key: "AD",
          data: [],
          totalTimeDiff: 0,
          successCount: 0,
          total: 40
        },
        {
          key: "B1T",
          data: [],
          totalTimeDiff: 0,
          successCount: 0,
          total: 20
        },
        {
          key: "B1D",
          data: [],
          totalTimeDiff: 0,
          successCount: 0,
          total: 20
        },
        {
          key: "B2T",
          data: [],
          totalTimeDiff: 0,
          successCount: 0,
          total: 20
        },
        {
          key: "B2D",
          data: [],
          totalTimeDiff: 0,
          successCount: 0,
          total: 20
        },
        {
          key: "T",
          validator: function(p, evt) {
            var res = p.responses;
            if (res.length >= 2) {
              if (
                (res[0].Code == 3 && res[1].Code != 3) ||
                (res[0].Code != 3 && res[1].Code == 3)
              ) {
                if (res[0].Code == 3) return res[0];
                if (res[1].Code == 3) return res[1];
              }
            } else if (res.length === 1) {
              if (res[0].Code == 3) return res[0];
            }
          },
          data: [],
          totalTimeDiff: 0,
          successCount: 0,
          total: 120
        }
      ]
    },
    methods: {
      clearData: function() {
        this.log.time = "";
        this.log.keys = [];
        this.log.data = [];
        this.pictures = [];
      },
      handleTabClick: function(tab) {
        this.tab = tab;
      },
      handleOnExceed: function(files, fileList) {
        console.log(files);
        console.log(fileList);
      },
      handleFileChange: function(file, fileList) {
        if (fileList.length > 1) {
          fileList.shift();
        }
        this.readLog(file.raw);
      },
      readLog: function(file) {
        var self = this;
        reader.readAsText(file, "utf-8");
        reader.onload = function() {
          self.getData(this.result);
        };
      },
      tableRowClassName({ row, rowIndex }) {
        if (row.isCalTimeDiff) {
          return "success-row";
        } else if (row.isCorrect) {
          return "warning-row";
        }
        return "";
      },
      spanMethod: function({ row, column, rowIndex, columnIndex }) {
        if (columnIndex === 0 || columnIndex === 1) {
          if (row["Event Type"] === "Picture") {
            return {
              rowspan: row.responses.length + 1,
              colspan: 1
            };
          } else {
            return {
              rowspan: 0,
              colspan: 0
            };
          }
        }
      },
      calculateResult: function(pictures) {
        this.result.forEach(function(res) {
          var successCount = 0,
            totalTimeDiff = 0;
          if (!res.validator) res.validator = commonValidator;
          res.data = pictures
            .filter(function(pic) {
              return ~pic.Code.indexOf(res.key);
            })
            .map(function(pic) {
              if (res.key === "T") pic = _.cloneDeep(pic);
              var rightRes = res.validator(pic, res.key);
              if (rightRes) {
                successCount++;
                totalTimeDiff += rightRes.timeDiff;
                pic.responses.forEach(function(r) {
                  r.isCorrect = true;
                  r.isCalTimeDiff = false;
                });
                rightRes.isCalTimeDiff = true;
              }
              pic.isCorrect = !!rightRes;
              return pic;
            });
          res.successCount = successCount;
          res.totalTimeDiff = totalTimeDiff;
        });
      },
      formatForDisplay: function(pictures) {
        var formatData = [];
        pictures.forEach(function(picture) {
          formatData.push(picture);
          formatData = formatData.concat(picture.responses);
        });
        return formatData;
      },
      getData: function(content) {
        var self = this,
          dataStart = false,
          keys = [],
          sourceData = [],
          formatData = [],
          pictures = [],
          nowPicture = null;
        content.split("\r\n").forEach(function(line) {
          if (~line.indexOf("Logfile written - "))
            self.log.time = line.replace("Logfile written - ", "");
          if (line && dataStart) {
            var item = {};
            line.split("\t").forEach(function(val, i) {
              item[keys[i]] = val;
            });
            sourceData.push(item);
            var cloneItem = _.cloneDeep(item);
            if (cloneItem["Event Type"] === "Picture") {
              pictures.push(cloneItem);
              nowPicture = cloneItem;
              cloneItem.responses = [];
            } else if (cloneItem["Event Type"] === "Response") {
              if (nowPicture) nowPicture.responses.push(cloneItem);
            }
          }
          if (~line.indexOf("Trial")) {
            line.split("\t").forEach(function(key) {
              keys.push(key);
            });
            dataStart = true;
          }
        });
        var failCount = 0,
          successCount = 0;
        pictures.forEach(function(picture) {
          picture.realTrial = ++successCount;
          picture.timeDiff = "";
          picture.responses.forEach(function(v) {
            v.realTrial = picture.realTrial;
            v.timeDiff = v.Time - picture.Time;
          });
        });
        this.log.keys = keys;
        this.log.data = sourceData;
        this.formatData = formatData;
        this.calculateResult(pictures);
        this.pictures = pictures;
      }
    }
  });
})();
