// Content script for X Country Blocker

// Inject the page script to access the page context and make API calls
function injectPageScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('pageScript.js');
    script.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

injectPageScript();

// State
let blockedCountries = [];
let debugMode = false;
const userCache = new Map(); // screenName -> { location: string|null, timestamp: number }
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Queue for fetching profiles
const fetchQueue = [];
let isFetching = false;
const BASE_DELAY = 2000; // 2 seconds minimum between fetches
const JITTER = 1000; // Up to 1 second random addition
let rateLimitResetTime = 0;

// Load settings
chrome.storage.local.get(['blockedCountries', 'debugMode'], (result) => {
    if (result.blockedCountries) {
        blockedCountries = result.blockedCountries;
    }
    if (result.debugMode) {
        debugMode = result.debugMode;
    }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.blockedCountries) {
            blockedCountries = changes.blockedCountries.newValue || [];
            processAllTweets();
        }
        if (changes.debugMode) {
            debugMode = changes.debugMode.newValue;
        }
    }
});

// Listen for messages from pageScript.js
window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === '__locationResponse') {
        const { screenName, location, isRateLimited } = event.data;

        if (!isRateLimited) {
            userCache.set(screenName, { location, timestamp: Date.now() });

            // Re-check visible tweets for this user
            const tweets = document.querySelectorAll('article[data-testid="tweet"]');
            tweets.forEach(node => {
                const link = node.querySelector('a[href^="/' + screenName + '"]');
                if (link) {
                    checkAndHide(node, screenName, location);
                }
            });

            if (debugMode && location) {
                console.log(`[X Block] Detected ${screenName} is based in ${location}`);
            }
        }

        // Continue queue
        const nextDelay = BASE_DELAY + Math.random() * JITTER;
        setTimeout(() => {
            isFetching = false;
            processQueue();
        }, nextDelay);
    }

    if (event.data.type === '__rateLimitInfo') {
        rateLimitResetTime = event.data.resetTime;
        const waitTime = event.data.waitTime;
        console.warn(`[X Block] Rate limit reached. Waiting ${Math.ceil(waitTime / 1000 / 60)} minutes.`);

        // Pause queue
        setTimeout(() => {
            rateLimitResetTime = 0;
            processQueue();
        }, waitTime);
    }
});

// DOM Observer
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
                const tweets = node.querySelectorAll ? node.querySelectorAll('article[data-testid="tweet"]') : [];
                if (node.matches && node.matches('article[data-testid="tweet"]')) {
                    processTweet(node);
                }
                tweets.forEach(processTweet);
            }
        });
    });
});

if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

function processTweet(tweetNode) {
    const userLink = tweetNode.querySelector('a[href^="/"][role="link"]');
    if (!userLink) return;

    const href = userLink.getAttribute('href');
    const screenName = href.replace('/', '');

    // Check cache
    if (userCache.has(screenName)) {
        const cached = userCache.get(screenName);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            checkAndHide(tweetNode, screenName, cached.location);
            return;
        }
    }

    // Queue for fetch
    if (!fetchQueue.includes(screenName)) {
        fetchQueue.push(screenName);
        processQueue();
    }
}

function processQueue() {
    if (isFetching || fetchQueue.length === 0) return;

    // Check rate limit
    if (rateLimitResetTime > 0) {
        const now = Date.now() / 1000;
        if (now < rateLimitResetTime) return; // Still waiting
    }

    isFetching = true;
    const screenName = fetchQueue.shift();
    const requestId = Date.now() + Math.random();

    window.postMessage({
        type: '__fetchLocation',
        screenName,
        requestId
    }, '*');
}

function checkAndHide(tweetNode, screenName, country) {
    if (!country) return;

    const isBlocked = blockedCountries.some(blocked =>
        blocked.toLowerCase() === country.toLowerCase() ||
        (country.length === 2 && blocked.length === 2 && blocked.toLowerCase() === country.toLowerCase())
    );

    if (isBlocked) {
        const cell = tweetNode.closest('[data-testid="cellInnerDiv"]');
        if (cell) {
            cell.style.setProperty('display', 'none', 'important');
        } else {
            tweetNode.style.setProperty('display', 'none', 'important');
        }
        if (debugMode) console.log(`[X Block] Hiding tweet from ${screenName} (${country})`);
    }
}

function processAllTweets() {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    tweets.forEach(processTweet);
}
