/* global Schedule fetchSchedule */

/**
 *
 * @param {Date} date
 */
const formatDate = date => {
	return date.toLocaleString('ja-JP', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		weekday: 'short',
	});
};

/**
 *
 * @param {Date} date
 */
const formatDateTime = date => {
	return date.toLocaleString('ja-JP', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
};

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


/**
 *
 * @param {object[]} dailySchedules
 * @param {string} dailySchedules[].date
 * @param {string[]} dailySchedules[].scheduleIds
 * @param {Object.<string, Schedule>} scheduleById
 * @param {string} targetUrl
 * @param {number} lastModified
 */
const displayEvents = (dailySchedules, scheduleById, targetUrl, lastModified) => {
	const lastModifiedElement = document.getElementById('lastModified');
	lastModifiedElement.innerText = `取得日: ${formatDateTime(new Date(lastModified))}`;

	const container = document.getElementById('schedule_container');
	container.innerText = '';

	dailySchedules.forEach(({date, scheduleIds}) => {
		const h1 = document.createElement('h1');
		h1.append(formatDate(new Date(date)));
		container.append(h1);
		scheduleIds.forEach(scheduleId => {
			const schedule = scheduleById[scheduleId];
			const url = `${targetUrl}aqua/${schedule.resid}/view?target=${date}`;

			const p = document.createElement('p');
			p.append(schedule.time);
			p.append(': ');
			const link = document.createElement('a');
			link.append(schedule.title);
			link.href = url;
			link.target = '_blank';
			p.append(link);
			container.append(p);

			link.addEventListener('click', evt => {
				evt.preventDefault();
				chrome.windows.create({
					url,
					type: chrome.windows.CreateType.POPUP,
					width: 1200,
					height: 800,
				});
			});
		});
	});
};
