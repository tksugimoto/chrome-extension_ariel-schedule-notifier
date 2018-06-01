/**
 * @param {object} alarm
 * @param {string} alarm.name
 * @returns {Promise}
 */
const clearAlarm = alarm => {
	return new Promise(resolve => {
		chrome.alarms.clear(alarm.name, resolve);
	});
};

/**
 * @returns {Promise}
 */
const clearScheduleNotificationAlarms = () => {
	return new Promise(resolve => {
		chrome.alarms.getAll(alarms => {
			const scheduleAlarms = alarms.filter(alarm => {
				const alarmParams = new URLSearchParams(alarm.name);
				return alarmParams.get('type') === 'schedule';
			});
			const promises = scheduleAlarms.map(clearAlarm);
			return Promise.all(promises).then(resolve);
		});
	});
};

/**
 *
 * @param {object[]} dailySchedules
 * @param {string} dailySchedules[].date
 * @param {string[]} dailySchedules[].scheduleIds
 * @param {Object.<string, Schedule>} scheduleById
 */
const refreshScheduleNotificationAlarms = (dailySchedules, scheduleById) => {
	const MS_5_MINUTES = 1000 * 60 * 5;

	clearScheduleNotificationAlarms().then(() => {
		dailySchedules.forEach(({date, scheduleIds}) => {
			scheduleIds.forEach(scheduleId => {
				const schedule = scheduleById[scheduleId];

				if (schedule.time.match(/^(\d+:\d+) -/)) {
					const startTime = RegExp.$1;
					const eventStartDate = new Date(`${date} ${startTime}`);

					const when = eventStartDate.getTime() - MS_5_MINUTES;

					if (when > Date.now()) {
						const alarmParams = new URLSearchParams();
						alarmParams.set('type', 'schedule');
						alarmParams.set('scheduleId', scheduleId);

						chrome.alarms.create(alarmParams.toString(), {
							when,
						});
					}
				}
			});
		});
	});
};

const onScheduleNotificationAlarm = {
	addListener: callback => {
		chrome.alarms.onAlarm.addListener(alarm => {
			const alarmParams = new URLSearchParams(alarm.name);
			if (alarmParams.get('type') === 'schedule') {
				const scheduleId = alarmParams.get('scheduleId');
				callback({
					scheduleId,
					scheduledTime: alarm.scheduledTime,
				});
			}
		});
	},
};

const startRefreshScheduleTimer = () => {
	const alarmParams = new URLSearchParams();
	alarmParams.set('type', 'refresh-schedule');

	chrome.alarms.create(alarmParams.toString(), {
		periodInMinutes: 60 * 1,
	});
};


const onRefreshScheduleTimer = {
	addListener: callback => {
		chrome.alarms.onAlarm.addListener(alarm => {
			const alarmParams = new URLSearchParams(alarm.name);
			if (alarmParams.get('type') === 'refresh-schedule') {
				callback();
			}
		});
	},
};

window.AlarmUtil = {
	refreshScheduleNotificationAlarms,
	onScheduleNotificationAlarm,
	startRefreshScheduleTimer,
	onRefreshScheduleTimer,
};
