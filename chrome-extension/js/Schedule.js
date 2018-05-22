
class Schedule {
	/**
	 *
	 * @param {object} schedule - original schedule data
	 */
	constructor(schedule) {
		this._originalData = schedule;
	}

	/**
	 * @param {object} arg
	 * @param {object} arg._originalData
	 * @returns {Schedule} aa
	 */
	static parse(arg) {
		return new this(arg._originalData);
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
			return `${resid}:${target}`;
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
};
