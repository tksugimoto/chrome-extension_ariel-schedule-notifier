import fetchSchedule from '/js/fetchSchedule.js';
import displayEvents from '/js/displayEvents.js';

const targetUrlInput = document.getElementById('target_url');

const targetUrlSettingStorageKey = 'target_url';

const allowedProtocols = [
	'http:',
	'https:',
];


chrome.storage.local.get({
	[targetUrlSettingStorageKey]: '',
}, items => {
	targetUrlInput.value = items[targetUrlSettingStorageKey];
});

const outputMessage = (() => {
	const messageElement = document.getElementById('message');
	return (message) => {
		messageElement.innerText = message;
	};
})();

document.getElementById('save_target_form').addEventListener('submit', evt => {
	evt.preventDefault();
	const targetUrl = new URL(targetUrlInput.value);
	if (allowedProtocols.includes(targetUrl.protocol)) {
		outputMessage('');
		// TODO: 前回許可したoriginをremove
		chrome.permissions.request({
			origins: [
				targetUrl.href,
			],
		}, granted => {
			if (granted) {
				chrome.storage.local.set({
					[targetUrlSettingStorageKey]: targetUrl.href,
				}, () => {
					outputMessage('設定完了');

					fetchSchedule(targetUrl).then(scheduleCache => {
						outputMessage('設定完了\n（別ユーザーの予定が表示される場合は、スケジュールアプリの先頭ユーザーを自分にしてください）');
						displayEvents(scheduleCache.dailySchedules, scheduleCache.scheduleById, targetUrl, scheduleCache.lastModified);
					}).catch(err => {
						console.error(err);
						outputMessage(`設定完了\n予定の取得に失敗しました（${err}）`);
					});
				});
			} else {
				outputMessage('設定失敗');
			}
		});
	}
});
