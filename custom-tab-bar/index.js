Component({
  data: {
    selected: 0,
    color: "#9ca3af",
    selectedColor: "#1B5E20",
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/images/icons/home-gray.svg",
        selectedIconPath: "/images/icons/home-green.svg"
      },
      {
        pagePath: "/pages/schedule/schedule",
        text: "赛程",
        iconPath: "/images/icons/calendar-gray.svg",
        selectedIconPath: "/images/icons/calendar-green.svg"
      },
      {
        pagePath: "/pages/standings/standings",
        text: "积分榜",
        iconPath: "/images/icons/chart-bar-gray.svg",
        selectedIconPath: "/images/icons/chart-bar-green.svg"
      },
      {
        pagePath: "/pages/more/more",
        text: "我的",
        iconPath: "/images/icons/users-gray.svg",
        selectedIconPath: "/images/icons/users-green.svg"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const index = data.index;
      const item = this.data.list[index];
      wx.switchTab({
        url: item.pagePath
      });
    }
  }
});