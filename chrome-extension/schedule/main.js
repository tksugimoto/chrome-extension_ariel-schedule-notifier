import Schedule from '/js/Schedule.js';
import fetchSchedule from '/js/fetchSchedule.js';
import displayEvents from '/js/displayEvents.js';

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
				document.getElementById('message').innerText = '再取得完了\n（別ユーザーの予定が表示される場合は、スケジュールアプリの先頭ユーザーを自分にしてください）';
				displayEvents(scheduleCache.dailySchedules, scheduleCache.scheduleById, targetUrl, scheduleCache.lastModified);
			}).catch(err => {
				console.error(err);
				document.getElementById('message').innerText = `取得に失敗しました（${err}）`;
			}).then(() => {
				target.disabled = false;
			});
		});

		const container = document.getElementById('schedule_container');
		const keywordInput = document.getElementById('keyword');
		keywordInput.focus();

		keywordInput.addEventListener('keydown', evt => {
			if (evt.key === 'Enter') {
				const keyword = keywordInput.value.toLocaleLowerCase();
				container.querySelectorAll('p').forEach(elem => {
					elem.style.display = elem.innerText.toLocaleLowerCase().includes(keyword) ? '' : 'none';
				});
			}
			if (evt.key === 'Escape') {
				keywordInput.value = '';
				container.querySelectorAll('p').forEach(elem => {
					elem.style.display = '';
				});
				evt.preventDefault();
			}
		});
	}
});
