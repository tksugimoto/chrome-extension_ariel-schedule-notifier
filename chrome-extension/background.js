/* global Schedule AlarmUtil fetchSchedule */

const ButtonIndex = {
	OPEN_SCHEDULE: 0,
};

const MS_5_MINUTES = 1000 * 60 * 5;

AlarmUtil.onScheduleAlarm.addListener(alarm => {
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

				chrome.notifications.create(scheduleId, {
					title: schedule.title,
					message: facility || '',
					contextMessage: schedule.time,
					type: 'basic',
					iconUrl: '/icon/icon.png',
					requireInteraction: true,
					buttons: [{
						title: '予定を開く',
					}],
				});
			}
		});
	}
});

chrome.notifications.onClicked.addListener(notificationId => {
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
	}
});

AlarmUtil.onRefreshScheduleTimer.addListener(() => {
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
	AlarmUtil.startRefreshScheduleTimer();

	if (details.reason === 'install') {
		chrome.runtime.openOptionsPage();
	}
});
