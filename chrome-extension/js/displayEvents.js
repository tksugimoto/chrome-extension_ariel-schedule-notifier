
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

/**
 *
 * @param {object[]} dailySchedules
 * @param {string} dailySchedules[].date
 * @param {string[]} dailySchedules[].scheduleIds
 * @param {Object.<string, Schedule>} scheduleById
 * @param {string} targetUrl
 * @param {number} lastModified
 */
const displayEvents = (dailySchedules, scheduleById, targetUrl, lastModified, option = {}) => {
	const lastModifiedElement = document.getElementById(option.lastModifiedElementId || 'lastModified');
	lastModifiedElement.innerText = `取得日: ${formatDateTime(new Date(lastModified))}`;

	const container = document.getElementById(option.containerElementId || 'schedule_container');
	container.innerText = '';

	dailySchedules.forEach(({date, scheduleIds}) => {
		const h1 = document.createElement('h1');
		h1.append(formatDate(new Date(date)));
		container.append(h1);
		scheduleIds.forEach(scheduleId => {
			const schedule = scheduleById[scheduleId];
			const url = `${targetUrl}aqua/${schedule.resid}/view?target=${schedule.targetDate}`;

			const p = document.createElement('p');
			p.append(schedule.time);
			p.append(': ');
			const link = document.createElement('a');
			link.append(schedule.title);
			link.href = url;
			link.target = '_blank';
			p.append(link);

			const facility = schedule.findFromOptions('施設');
			if (facility) {
				p.append(document.createElement('br'));
				p.append(`施設: ${facility}`);
			}

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

export default displayEvents;
