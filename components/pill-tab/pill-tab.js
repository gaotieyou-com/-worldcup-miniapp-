Component({
  properties: {
    active: {
      type: Boolean,
      value: false
    },
    variant: {
      type: String,
      value: "solid" // solid | ghost
    }
  },
  methods: {
    onTap() {
      this.triggerEvent("tap");
    }
  }
});