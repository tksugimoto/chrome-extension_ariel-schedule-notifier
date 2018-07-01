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
				// 再通知用alarmはクリアしない
				if (alarmParams.get('re-notification') === 'true') return false;
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

				// 2日以上の（0:00をまたぐ）予定の2日目以降（各日0:00）は通知しない
				if (schedule.targetDate !== date) return;

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
				const isFirstTime = alarmParams.get('re-notification') !== 'true';
				callback({
					scheduleId,
					scheduledTime: alarm.scheduledTime,
					isFirstTime,
				});
			}
		});
	},
};

const startRefreshScheduleAlarm = () => {
	const alarmParams = new URLSearchParams();
	alarmParams.set('type', 'refresh-schedule');

	chrome.alarms.create(alarmParams.toString(), {
		// 現在から60分間の間のランダムな時刻に初回の更新を設定
		// 拡張の更新が複数ユーザーで同時に発生すると予定取得が短時間に発生しサーバーの負荷となるため散らす
		when: Date.now() + 1000 * 60 * 60 * Math.random(),
		periodInMinutes: 60 * 1,
	});
};


const onRefreshScheduleAlarm = {
	addListener: callback => {
		chrome.alarms.onAlarm.addListener(alarm => {
			const alarmParams = new URLSearchParams(alarm.name);
			if (alarmParams.get('type') === 'refresh-schedule') {
				callback();
			}
		});
	},
};


/**
 * @param {Schedule} schedule
 * @param {number} when the time value in milliseconds
 */
const startClearScheduleNotificationAlarm = (schedule, when) => {
	const alarmParams = new URLSearchParams();
	alarmParams.set('type', 'clear-schedule-notification');
	alarmParams.set('scheduleId', schedule.id);

	chrome.alarms.create(alarmParams.toString(), {
		when,
	});
};

const onClearScheduleNotificationAlarm = {
	addListener: callback => {
		chrome.alarms.onAlarm.addListener(alarm => {
			const alarmParams = new URLSearchParams(alarm.name);
			if (alarmParams.get('type') === 'clear-schedule-notification') {
				const scheduleId = alarmParams.get('scheduleId');
				callback({
					scheduleId,
				});
			}
		});
	},
};


/**
 * @param {Schedule} schedule
 * @param {number} when the time value in milliseconds
 */
const startReNoticeScheduleNotificationAlarm = (schedule, when) => {
	const alarmParams = new URLSearchParams();
	alarmParams.set('type', 'schedule');
	alarmParams.set('scheduleId', schedule.id);
	alarmParams.set('re-notification', 'true');

	chrome.alarms.create(alarmParams.toString(), {
		when,
	});
};


export default {
	refreshScheduleNotificationAlarms,
	onScheduleNotificationAlarm,
	startRefreshScheduleAlarm,
	onRefreshScheduleAlarm,
	startClearScheduleNotificationAlarm,
	onClearScheduleNotificationAlarm,
	startReNoticeScheduleNotificationAlarm,
};
