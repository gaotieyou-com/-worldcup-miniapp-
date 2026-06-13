const app = getApp();

Component({
  options: {
    multipleSlots: true
  },
  properties: {
    title: {
      type: String,
      value: ""
    },
    showBack: {
      type: Boolean,
      value: false
    },
    showFavorite: {
      type: Boolean,
      value: false
    },
    isFavorite: {
      type: Boolean,
      value: false
    },
    transparent: {
      type: Boolean,
      value: false
    },
    leftIcon: {
      type: String,
      value: ""
    }
  },
  data: {
    statusBarHeight: 0,
    menuButtonHeight: 0,
    menuButtonMargin: 0,
    navHeight: 0
  },
  lifetimes: {
    attached() {
      this.setData({
        statusBarHeight: app.globalData.statusBarHeight,
        menuButtonHeight: app.globalData.menuButtonHeight,
        menuButtonMargin: app.globalData.menuButtonMargin,
        navHeight: app.globalData.navBarHeight
      });
    }
  },
  methods: {
    onLeftTap() {
      if (this.data.showBack) {
        wx.navigateBack({
          delta: 1
        });
      }
      this.triggerEvent("leftTap");
    },
    onFavoriteTap() {
      this.triggerEvent("favorite");
    }
  }
});