Component({
  properties: {
    match: {
      type: Object,
      value: null
    },
    finalMatch: {
      type: Object,
      value: null
    },
    featureFlags: {
      type: Object,
      value: {}
    },
    playedMatchesCount: {
      type: Number,
      value: 0
    }
  },
  data: {
    title: "距开幕",
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
    isStarted: false,
    timer: null
  },
  lifetimes: {
    attached() {
      this.startCountdown();
    },
    detached() {
      this.stopCountdown();
    }
  },
  methods: {
    startCountdown() {
      // Tournament start date: June 11, 2026 00:00 UTC-5 (Mexico time)
      // Which is June 11, 2026 05:00 UTC
      const startDate = new Date("2026-06-11T05:00:00Z");
      const now = new Date();
      
      if (now >= startDate) {
        this.setData({ isStarted: true });
        return;
      }
      
      this.updateCountdown(startDate);
      const timer = setInterval(() => {
        this.updateCountdown(startDate);
      }, 1000);
      
      this.setData({ timer });
    },
    
    stopCountdown() {
      if (this.data.timer) {
        clearInterval(this.data.timer);
        this.setData({ timer: null });
      }
    },
    
    updateCountdown(targetDate) {
      const now = new Date();
      const diff = targetDate - now;
      
      if (diff <= 0) {
        this.setData({ isStarted: true });
        this.stopCountdown();
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      this.setData({
        days: String(days).padStart(2, "0"),
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0")
      });
    }
  }
});