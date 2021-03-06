import Schedule from '/js/Schedule.js';
import AlarmUtil from '/js/AlarmUtil.js';
import fetchSchedule from '/js/fetchSchedule.js';

const ButtonIndex = {
	OPEN_SCHEDULE: 0,
	RE_NOTIFICATION: 1,
};

const MS_5_MINUTES = 1000 * 60 * 5;
const MS_1_MINUTES = 1000 * 60 * 1;

AlarmUtil.onScheduleNotificationAlarm.addListener(alarm => {
	const scheduleId = alarm.scheduleId;

	// 5分以上経過していたら通知しない
	if (Date.now() - alarm.scheduledTime >= MS_5_MINUTES) {
		return;
	} else {
		chrome.storage.local.get([
			'scheduleCache',
		], ({
			scheduleCache,
		}) => {
			if (scheduleCache) {
				const schedule = Schedule.parse(scheduleCache.scheduleById[scheduleId]);
				const facility = schedule.findFromOptions('施設');

				const buttons = [{
					title: '予定を開く',
				}];

				if (alarm.isFirstTime) {
					// TODO: 再通知時刻を変更できるようにする
					buttons.push({
						title: '予定開始1分前に再通知',
					});
				}

				chrome.notifications.create(schedule.id, {
					title: schedule.title,
					message: facility || '',
					contextMessage: schedule.time,
					type: 'basic',
					iconUrl: '/icon/icon128.png',
					requireInteraction: true,
					buttons,
				});

				// 10分後に通知を削除する
				// TODO: 通知時刻ではなく予定開始時刻をベースに通知削除時刻を決定
				AlarmUtil.startClearScheduleNotificationAlarm(schedule, alarm.scheduledTime + 1000 * 60 * 10);
			}
		});
	}
});

chrome.notifications.onClicked.addListener(notificationId => {
	chrome.notifications.clear(notificationId);
});

AlarmUtil.onClearScheduleNotificationAlarm.addListener(({
	scheduleId: notificationId,
}) => {
	chrome.notifications.clear(notificationId);
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
	if (buttonIndex === ButtonIndex.OPEN_SCHEDULE) {
		const targetUrlSettingStorageKey = 'target_url';

		chrome.storage.local.get([
			'scheduleCache',
			targetUrlSettingStorageKey,
		], ({
			scheduleCache,
			target_url: targetUrl,
		}) => {
			if (scheduleCache) {
				const scheduleId = notificationId;

				const schedule = Schedule.parse(scheduleCache.scheduleById[scheduleId]);

				const url = `${targetUrl}aqua/${schedule.resid}/view?target=${schedule.targetDate}`;
				chrome.windows.create({
					url,
					type: chrome.windows.CreateType.POPUP,
					width: 1200,
					height: 800,
				});
			}
		});
	} else if (buttonIndex === ButtonIndex.RE_NOTIFICATION) {
		chrome.notifications.clear(notificationId);

		chrome.storage.local.get([
			'scheduleCache',
		], ({
			scheduleCache,
		}) => {
			if (scheduleCache) {
				const scheduleId = notificationId;

				const schedule = Schedule.parse(scheduleCache.scheduleById[scheduleId]);

				if (schedule.time.match(/^(\d+:\d+) -/)) {
					const startTime = RegExp.$1;
					const eventStartDate = new Date(`${schedule.targetDate} ${startTime}`);

					const when = eventStartDate.getTime() - MS_1_MINUTES;
					AlarmUtil.startReNoticeScheduleNotificationAlarm(schedule, when);
				}
			}
		});
	}
});

AlarmUtil.onRefreshScheduleAlarm.addListener(() => {
	const targetUrlSettingStorageKey = 'target_url';
	chrome.storage.local.get({
		[targetUrlSettingStorageKey]: '',
	}, items => {
		const targetUrl = items[targetUrlSettingStorageKey];

		if (targetUrl) {
			fetchSchedule(targetUrl).catch(err => {
				console.error(err);
			});
		}
	});
});

chrome.runtime.onInstalled.addListener(details => {
	AlarmUtil.startRefreshScheduleAlarm();

	if (details.reason === 'update') {
		if (details.previousVersion === '0.5.0') {
			// 0.5.0 からのアップデートでScheduleのid仕様が変わっているため、新idでも保存し直す
			chrome.storage.local.get([
				'scheduleCache',
			], ({
				scheduleCache,
			}) => {
				if (scheduleCache) {
					for (const rawSchedule of Object.values(scheduleCache.scheduleById)) {
						const schedule = Schedule.parse(rawSchedule);
						scheduleCache.scheduleById[schedule.id] = schedule;
					}

					chrome.storage.local.set({
						scheduleCache,
					});
				}
			});
		}
		return;
	}

	if (details.reason === 'install') {
		chrome.runtime.openOptionsPage();
	}
});
