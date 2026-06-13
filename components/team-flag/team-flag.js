const flagMapping = require("../../utils/flagMapping");
const builtinData = require("../../utils/builtin-data");

Component({
  properties: {
    teamCode: {
      type: String,
      value: ""
    },
    team: {
      type: Object,
      value: null
    },
    showName: {
      type: Boolean,
      value: false
    },
    size: {
      type: String,
      value: "small" // tiny | small | medium | large
    },
    layout: {
      type: String,
      value: "horizontal" // horizontal | vertical
    },
    useImageFlag: {
      type: Boolean,
      value: false
    }
  },
  data: {
    flagUrl: "",
    flagEmoji: "",
    teamName: ""
  },
  observers: {
    "teamCode, team": function() {
      this.updateFlag();
    }
  },
  lifetimes: {
    attached() {
      this.updateFlag();
    }
  },
  methods: {
    updateFlag() {
      const team = this.data.team;
      const teamCode = this.data.teamCode || (team && team.code) || "";
      
      if (!teamCode) {
        this.setData({ flagUrl: "", flagEmoji: "", teamName: "" });
        return;
      }
      
      // Get flag URL
      const flagUrl = flagMapping.getFlagUrl(teamCode);
      
      // Get team data for emoji and name
      const teams = builtinData.getTeams();
      const teamData = teams.find(t => t.code === teamCode) || team || {};
      
      this.setData({
        flagUrl: flagUrl || "",
        flagEmoji: teamData.flag || "🏳️",
        teamName: teamData.nameCn || teamData.name || teamCode
      });
    }
  }
});