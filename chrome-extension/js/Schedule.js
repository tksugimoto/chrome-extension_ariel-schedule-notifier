
class Schedule {
	/**
	 *
	 * @param {object} schedule - original schedule data
	 * @param {string} date YYYY-MM-DD 複数日にまたがる予定の場合に区別するための日付
	 */
	constructor(schedule, date) {
		this._originalData = schedule;
		this._date = date;
	}

	/**
	 * @param {object} arg
	 * @param {object} arg._originalData
	 * @param {string} arg._date YYYY-MM-DD
	 * @returns {Schedule} aa
	 */
	static parse(arg) {
		return new this(arg._originalData, arg._date);
	}

	/**
	 * @returns {boolean}
	 */
	get isValid() {
		return !!this._originalData.record;
	}

	/**
	 * @returns {string}
	 */
	get id() {
		if (this.isValid) {
			const resid = this._originalData.record.resid;
			const target = this._originalData.record.target;
			return `${resid}:${target}:${this._date}`;
		}
	}

	/**
	 * @returns {string}
	 */
	get resid() {
		return this._originalData.record.resid;
	}

	/**
	 * @returns {string} YYYY-MM-DD
	 */
	get targetDate() {
		return this._originalData.record.target;
	}

	/**
	 * @returns {string}
	 */
	get title() {
		return this._originalData.title;
	}

	/**
	 * @returns {string}
	 */
	get time() {
		return this._originalData.time;
	}

	/**
	 * @param {string} targetLabel
	 * @returns {string} result
	 */
	findFromOptions(targetLabel) {
		const resultOption = this._originalData.options.find(({label}) => label === targetLabel);
		return resultOption ? resultOption.value : null;
	}
}

export default Schedule;
