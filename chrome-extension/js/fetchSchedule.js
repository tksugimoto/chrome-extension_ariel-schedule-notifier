/* global Schedule AlarmUtil */

/**
 *
 * @param {Date} date
 */
const generateCalendarDateFormat = date => {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
};

/**
 * @param {string} targetUrl
 */
window.fetchSchedule = (targetUrl) => {
	const params = new URLSearchParams();
	params.set('exa', 'calendar');
	params.set('viewId', 'schedule-list/to-json');
	params.set('start', generateCalendarDateFormat(new Date()));
	params.toString();

	return fetch(`${targetUrl}aqua/0/schedule/view?${params.toString()}`, {
		credentials: 'include',
	}).then(res => {
		const contentType = res.headers.get('content-type');
		if (contentType.startsWith('application/json')) {
			return res.json();
		}
		// レスポンスがJSONでない
		throw 'おそらくログインしてない';
	}).then(json => {
		const scheduleById = {};
		for (const event of Object.values(json.events)) {
			for (const s of event.schedules) {
				const schedule = new Schedule(s);
				if (schedule.isValid) {
					scheduleById[schedule.id] = schedule;
				}
			}
		}

		const dailySchedules = Object.entries(json.events).sort(([date1], [date2]) => {
			if (date1 > date2) return 1;
			if (date1 < date2) return -1;
			return 0;
		}).map(([date, {schedules}]) => {
			const scheduleIds = schedules.map(s => new Schedule(s)).filter(schedule => schedule.isValid).map(schedule => schedule.id);
			return {
				date,
				scheduleIds,
			};
		});

		return {
			dailySchedules,
			scheduleById,
		};
	}).then(({dailySchedules, scheduleById}) => {
		const scheduleCache = {
			dailySchedules,
			scheduleById,
			lastModified: Date.now(),
		};

		chrome.storage.local.set({
			scheduleCache,
		});

		AlarmUtil.scheduleAlarms(dailySchedules, scheduleById);

		return scheduleCache;
	});
};
