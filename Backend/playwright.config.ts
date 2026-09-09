{
  "name": "playwright-config",
  "testDir": "./tests",
  "timeout": 60000,
  "retries": 1,
  "workers": 1,
  "use": {
    "baseURL": "http://localhost:8000",
    "headless": true,
    "slowMo": 1000,
    "screenshot": "only-on-failure",
    "video": "retain-on-failure",
  },
  "webServer": {
    "command": "npm run dev",
    "port": 8000,
    "timeout": 120000,
    "reuseExistingServer": false,
  },
}
