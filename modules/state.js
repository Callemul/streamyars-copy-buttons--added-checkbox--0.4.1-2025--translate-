// modules/state.js
window.SYH_STATE = {
    itemStates: [],

    updateState: function(textKey, isChecked) {
        if (!textKey) return;
        let element = this.itemStates.find(x => x.text === textKey);
        if (element) {
            element.isChecked = isChecked;
        } else {
            this.itemStates.push({ text: textKey, isChecked: isChecked });
        }
    },

    getCheckedState: function(textKey) {
        if (!textKey) return false;
        const element = this.itemStates.find(item => item.text === textKey);
        return element ? element.isChecked : false;
    }
};