import Schedule from './Schedule.js';
import AlarmUtil from './AlarmUtil.js';

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
 *
 * @param {Date} refreshDate
 */
const formatRefreshDateTime = refreshDate => {
	return refreshDate.toLocaleString('ja-JP', {
		month: '2-digit',
		day: '2-digit',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
};

const updateStatus = ({
	refreshSucceeded,
	refreshDate,
}) => {
	const status = refreshSucceeded ? '更新成功' : '更新失敗';
	const badgeText = refreshSucceeded ? '' : 'X';
	const badgeBackgroundColor = refreshSucceeded ? [0, 0, 0, 0] : 'red';

	const extensionName = chrome.runtime.getManifest().name;
	chrome.browserAction.setTitle({
		title: `${extensionName}\n${status}\n${formatRefreshDateTime(refreshDate)}`,
	});
	chrome.browserAction.setBadgeText({
		text: badgeText,
	});
	chrome.browserAction.setBadgeBackgroundColor({
		color: badgeBackgroundColor,
	});
};

/**
 * @param {string} targetUrl
 */
const fetchSchedule = (targetUrl) => {
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
		for (const [date, event] of Object.entries(json.events)) {
			for (const s of event.schedules) {
				const schedule = new Schedule(s, date);
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
			const scheduleIds = schedules.map(s => new Schedule(s, date)).filter(schedule => schedule.isValid).map(schedule => schedule.id);
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

		AlarmUtil.refreshScheduleNotificationAlarms(dailySchedules, scheduleById);

		return scheduleCache;
	}).then(scheduleCache => {
		updateStatus({
			refreshSucceeded: true,
			refreshDate: new Date(scheduleCache.lastModified),
		});
		return scheduleCache;
	}).catch(err => {
		updateStatus({
			refreshSucceeded: false,
			refreshDate: new Date,
		});
		throw err;
	});
};

export default fetchSchedule;
