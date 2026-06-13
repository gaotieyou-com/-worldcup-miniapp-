const matchStatus = require("../../utils/matchStatus");

Component({
  properties: {
    match: {
      type: Object,
      value: {}
    },
    mode: {
      type: String,
      value: "normal" // normal | compact
    },
    showPredictHint: {
      type: Boolean,
      value: false
    },
    predictCount: {
      type: Number,
      value: 0
    }
  },
  data: {
    isLive: false,
    isFinished: false,
    homeScore: 0,
    awayScore: 0,
    statusClass: "",
    statusText: ""
  },
  observers: {
    "match": function(match) {
      if (!match) return;
      
      const status = matchStatus.normalizeStatus(match.status);
      const MATCH_STATUS = matchStatus.MATCH_STATUS;
      
      const isLive = status === MATCH_STATUS.LIVE;
      const isFinished = status === MATCH_STATUS.FINISHED;
      
      let homeScore = 0;
      let awayScore = 0;
      let statusText = "";
      let statusClass = "";
      
      if (match.score && match.score.ft) {
        homeScore = match.score.ft[0] || 0;
        awayScore = match.score.ft[1] || 0;
      }
      
      if (isLive) {
        statusText = "进行中";
        statusClass = "live";
      } else if (isFinished) {
        statusText = "已结束";
        statusClass = "finished";
      } else {
        statusText = "未开始";
        statusClass = "";
      }
      
      this.setData({
        isLive,
        isFinished,
        homeScore,
        awayScore,
        statusClass,
        statusText
      });
    }
  }
});