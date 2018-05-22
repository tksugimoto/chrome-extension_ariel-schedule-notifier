/* global Schedule */

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

            fetchSchedule().then(scheduleCache => {
                displayEvents(scheduleCache.dailySchedules, scheduleCache.scheduleById, targetUrl, scheduleCache.lastModified);
            }).catch(err => {
                console.error(err);
                document.getElementById('message').innerText = `取得に失敗しました（${err}）`;
            }).then(() => {
                target.disabled = false;
            });
        });
    
        const fetchSchedule = () => {
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

                scheduleAlarms(dailySchedules, scheduleById);

                return scheduleCache;
            });
        };
    }
});

/**
 * 
 * @param {object[]} dailySchedules 
 * @param {string} dailySchedules[].date
 * @param {string[]} dailySchedules[].scheduleIds
 * @param {Object.<string, Schedule>} scheduleById 
 */
const scheduleAlarms = (dailySchedules, scheduleById) => {
    const MS_5_MINUTES = 1000 * 60 * 5;

    chrome.alarms.clearAll(() => {
        dailySchedules.forEach(({date, scheduleIds}) => {
            scheduleIds.forEach(scheduleId => {
                const schedule = scheduleById[scheduleId];

                if (schedule.time.match(/^(\d+:\d+) -/)) {
                    const startTime = RegExp.$1;
                    const eventStartDate = new Date(`${date} ${startTime}`);

                    const when = eventStartDate.getTime() - MS_5_MINUTES;

                    if (when > Date.now()) {
                        const alarmParams = new URLSearchParams();
                        alarmParams.set('type', 'schedule');
                        alarmParams.set('date', date);
                        alarmParams.set('scheduleId', scheduleId);
                        alarmParams.set('title', schedule.title);

                        chrome.alarms.create(alarmParams.toString(), {
                            when,
                        });
                    }
                }
            });
        });
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
