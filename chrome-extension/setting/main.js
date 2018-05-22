
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

document.getElementById('save_target_form').addEventListener('submit', evt => {
    evt.preventDefault();
    const targetUrl = new URL(targetUrlInput.value);
    if (allowedProtocols.includes(targetUrl.protocol)) {
        // TODO: 前回許可したoriginをremove
        chrome.permissions.request({
            origins: [
                targetUrl.href,
            ],
        }, granted => {
            if (granted) {
                chrome.storage.local.set({
                    [targetUrlSettingStorageKey]: targetUrl.href,
                });
            }
       });
    }
});
