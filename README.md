# Fantasy Basketball Monitor

Automated monitoring system that sends email alerts when available players meet your performance thresholds.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Settings

Edit `config.json`:

#### Email Settings:
```json
"email": {
  "to": "your-email@gmail.com",           // Where to send alerts
  "from": {
    "user": "your-gmail@gmail.com",        // Your Gmail
    "appPassword": "xxxx xxxx xxxx xxxx"   // Gmail App Password
  }
}
```

#### Thresholds:
```json
"thresholds": {
  "points": 15,        // Minimum points
  "rebounds": 4,       // Minimum rebounds
  "assists": 4,        // Minimum assists
  "threePointers": 2,  // Minimum 3-pointers made
  "steals": 1,         // Minimum steals
  "blocks": 0,         // Minimum blocks
  "turnovers": 4       // MAXIMUM turnovers allowed
}
```

#### Monitoring Settings:
```json
"monitoring": {
  "checkIntervalMinutes": 5,        // How often to check
  "onlyDuringGameTimes": true,      // Only check during game hours
  "gameTimeStart": "17:00",         // Start checking at 5pm
  "gameTimeEnd": "23:59",           // Stop checking at midnight
  "timezone": "America/Los_Angeles" // Your timezone
}
```

### 3. Generate Roster File

Run the roster fetcher to create `2026_rostered_player_ids.json`:
```bash
node historical_roster_fetcher.js
```

This creates a file with all rostered player IDs so the monitor only alerts for available players.

### 4. Test Email
```bash
npm test
```

Make sure you receive the test email before starting the monitor.

### 5. Start Monitoring
```bash
npm start
```

The monitor will:
- ✅ Check games every 5 minutes (configurable)
- ✅ Only during game times (configurable)
- ✅ Send email when players meet ALL thresholds
- ✅ Only alert about available players (not rostered)
- ✅ Track alerts to avoid spam (1 alert per player per day)

## Usage

### Start Monitor
```bash
npm start
```

Press `Ctrl+C` to stop.

### Update Thresholds

Just edit `config.json` and restart the monitor:
```bash
# Stop with Ctrl+C
# Edit config.json
npm start
```

### Update Roster

Re-run the roster fetcher when rosters change:
```bash
node historical_roster_fetcher.js
# Monitor will automatically use the new file
```

## What You'll Get

### Email Alerts Look Like:
```
Subject: 🏀 FANTASY ALERT: Paolo Banchero Available!

Paolo Banchero (ORL) ✓ AVAILABLE

Game: ORL vs BOS
Minutes: 34

Stats:
22 PTS | 8 REB | 5 AST | 2 3PM | 1 STL | 2 BLK | 2 TO

[View Full Box Score Button]

Your Current Thresholds:
Points: 15+ | Rebounds: 4+ | Assists: 4+ | 3PM: 2+
Steals: 1+ | Blocks: 0+ | Turnovers: 4 max
```

### Console Output:
```
🔍 Checking games at 10/12/2024, 7:35:21 PM
============================================================
🏀 Found 6 game(s) today
   ORL @ BOS - In Progress
   LAL @ PHX - In Progress
   ...

   Analyzing ORL @ BOS...
   Analyzing LAL @ PHX...

🚨 2 NEW ALERT(S)!
   ✅ Paolo Banchero: 22pts, 8reb, 5ast
   ✅ Anthony Davis: 28pts, 12reb, 4ast

✅ Alert email sent for 2 player(s)
   📧 Paolo Banchero
   📧 Anthony Davis
```

## Features

### Smart Monitoring
- Only checks during configured game times
- Automatically finds all games for the day
- Rate-limited API calls to avoid blocks

### Alert Management
- Tracks which players already alerted today
- No spam - one alert per player per day
- Only alerts for available players (if roster loaded)

### Easy Configuration
- All settings in one `config.json` file
- Edit anytime, just restart
- Multiple timezone support

## Troubleshooting

### No Emails Arriving
1. Check spam folder
2. Verify Gmail App Password is correct
3. Run `npm test` to test email sending
4. Make sure "to" email address is correct

### No Alerts Being Sent
1. Check if within game time window
2. Lower thresholds temporarily to test
3. Check console output for errors
4. Verify games are happening (preseason/regular season)

### Roster Not Loading
1. Make sure `2026_rostered_player_ids.json` exists
2. Run `node historical_roster_fetcher.js` to regenerate
3. Check file path in config.json

## Tips

### During Preseason
- Lower thresholds to test (set everything to 0)
- Check interval can be longer (10-15 minutes)
- Some preseason games may have incomplete stats

### During Regular Season
- Fine-tune thresholds based on alerts you get
- Check every 5 minutes for timely alerts
- Update roster file after draft/trades

### Running 24/7
To keep monitor running even when you close terminal:

**Option 1: PM2 (Recommended)**
```bash
npm install -g pm2
pm2 start monitor.js --name "basketball-monitor"
pm2 save
pm2 startup  # Follow instructions to auto-start on reboot
```

**Option 2: Screen/Tmux**
```bash
screen -S monitor
npm start
# Press Ctrl+A then D to detach
# Reattach with: screen -r monitor
```

## Files

- `monitor.js` - Main monitoring script
- `config.json` - All settings (edit this!)
- `email-test.js` - Test email configuration
- `historical_roster_fetcher.js` - Generate roster file
- `2026_rostered_player_ids.json` - Rostered players (auto-generated)

## Support

Issues? Check:
1. Console output for error messages
2. Config.json is valid JSON (use a validator)
3. All required files exist
4. Internet connection is stable

Happy monitoring! 🏀📧