/**
 *
 * @param {object[]} dailySchedules
 * @param {string} dailySchedules[].date
 * @param {string[]} dailySchedules[].scheduleIds
 * @param {Object.<string, Schedule>} scheduleById
 */
const createScheduleAlarms = (dailySchedules, scheduleById) => {
	const MS_5_MINUTES = 1000 * 60 * 5;

	chrome.alarms.clearAll(() => {
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

const onScheduleAlarm = {
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

window.AlarmUtil = {
	createScheduleAlarms,
	onScheduleAlarm,
};
