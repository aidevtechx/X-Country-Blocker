# X Country Blocker

A Chrome extension that allows you to block X (Twitter) posts from users based in specific countries.

## Features

- **Country Blocking**: Select countries to block from a comprehensive list.
- **Auto-Detection**: Automatically detects the country of origin for users on your timeline.
- **Stealth Mode**: Uses advanced page script injection to fetch user location data legitimately, avoiding 403 errors and detection.
- **Rate Limit Protection**: Includes smart queuing and jitter to respect X's rate limits.
- **Debug Mode**: View detailed logs in the console to see what the extension is doing.

## Installation

Since this extension is not yet in the Chrome Web Store, you need to install it in "Developer Mode".

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the folder containing this extension (where `manifest.json` is located).

## How to Use

1.  Click the extension icon in your toolbar.
2.  Type the name of a country you want to block (e.g., "United States", "India", "West Asia").
3.  Select it from the dropdown and click **Add**.
4.  Refresh your X timeline. Tweets from users in those countries will now be hidden.

## Technical Details

This extension uses a "Page Script Injection" technique.
1.  It injects a script (`pageScript.js`) into the page context.
2.  This script intercepts the authentication headers used by X's own internal API calls.
3.  It uses these headers to make authenticated requests to the `AboutAccountQuery` GraphQL endpoint to fetch the `account_based_in` field for users.
4.  This ensures the requests are authorized and legitimate.

## Credits

Inspired by and based on the technical approach from [RhysSullivan/twitter-account-location-in-username](https://github.com/RhysSullivan/twitter-account-location-in-username).

## License

MIT
