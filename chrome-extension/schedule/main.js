/* global Schedule fetchSchedule displayEvents */

const targetUrlSettingStorageKey = 'target_url';
chrome.storage.local.get({
	[targetUrlSettingStorageKey]: '',
}, items => {
	const targetUrl = items[targetUrlSettingStorageKey];

	if (targetUrl) {
		chrome.storage.local.get('scheduleCache', ({scheduleCache}) => {
			if (scheduleCache) {
				const scheduleById = Object.assign(...Object.entries(scheduleCache.scheduleById).map(([id, obj]) => {
					return {
						[id]: Schedule.parse(obj),
					};
				}));

				displayEvents(scheduleCache.dailySchedules, scheduleById, targetUrl, scheduleCache.lastModified);
			}
		});

		document.getElementById('refresh').addEventListener('click', ({target}) => {
			target.disabled = true;
			document.getElementById('message').innerText = '';

			fetchSchedule(targetUrl).then(scheduleCache => {
				displayEvents(scheduleCache.dailySchedules, scheduleCache.scheduleById, targetUrl, scheduleCache.lastModified);
			}).catch(err => {
				console.error(err);
				document.getElementById('message').innerText = `取得に失敗しました（${err}）`;
			}).then(() => {
				target.disabled = false;
			});
		});
	}
});
