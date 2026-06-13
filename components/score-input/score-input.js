Component({
  properties: {
    homeScore: {
      type: Number,
      value: 0
    },
    awayScore: {
      type: Number,
      value: 0
    },
    homeName: {
      type: String,
      value: "主队"
    },
    awayName: {
      type: String,
      value: "客队"
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    onHomeMinus() {
      if (this.data.disabled || this.data.homeScore <= 0) return;
      this.triggerEvent("change", {
        homeScore: this.data.homeScore - 1,
        awayScore: this.data.awayScore
      });
    },
    onHomePlus() {
      if (this.data.disabled || this.data.homeScore >= 9) return;
      this.triggerEvent("change", {
        homeScore: this.data.homeScore + 1,
        awayScore: this.data.awayScore
      });
    },
    onAwayMinus() {
      if (this.data.disabled || this.data.awayScore <= 0) return;
      this.triggerEvent("change", {
        homeScore: this.data.homeScore,
        awayScore: this.data.awayScore - 1
      });
    },
    onAwayPlus() {
      if (this.data.disabled || this.data.awayScore >= 9) return;
      this.triggerEvent("change", {
        homeScore: this.data.homeScore,
        awayScore: this.data.awayScore + 1
      });
    }
  }
});