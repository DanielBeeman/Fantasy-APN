// Fantasy Basketball Monitor - Main Script
// Continuously monitors games and sends email alerts

const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');

// ============================================
// LOAD CONFIGURATION
// ============================================
let config;
try {
  config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.log('✅ Configuration loaded successfully\n');
} catch (error) {
  console.error('❌ Error loading config.json:', error.message);
  console.error('Make sure config.json exists and is valid JSON\n');
  process.exit(1);
}

// ============================================
// STATE MANAGEMENT
// ============================================
let rosteredPlayerIds = [];
let alertedPlayers = new Set(); // Track who we've already alerted about
let emailTransporter = null;

// ============================================
// LOAD ROSTER DATA
// ============================================
function loadRosterData() {
  try {
    if (fs.existsSync(config.rosterFile)) {
      const data = JSON.parse(fs.readFileSync(config.rosterFile, 'utf8'));
      rosteredPlayerIds = Array.isArray(data) ? data : [];
      console.log(`✅ Loaded ${rosteredPlayerIds.length} rostered players from ${config.rosterFile}`);
      return true;
    } else {
      console.log(`⚠️  Roster file not found: ${config.rosterFile}`);
      console.log('   Monitoring will continue but cannot filter by availability\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error loading roster file:', error.message);
    return false;
  }
}

// ============================================
// EMAIL SETUP
// ============================================
function setupEmail() {
  try {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.from.user,
        pass: config.email.from.appPassword
      }
    });
    console.log('✅ Email transporter configured\n');
    return true;
  } catch (error) {
    console.error('❌ Error setting up email:', error.message);
    return false;
  }
}

// ============================================
// SEND ALERT EMAIL
// ============================================
async function sendAlertEmail(players) {
  if (players.length === 0) return;
  
  const subject = players.length === 1
    ? `🏀 FANTASY ALERT: ${players[0].name} Available!`
    : `🏀 FANTASY ALERT: ${players.length} Players Available!`;
  
  const playerCards = players.map(player => `
    <div style="background: #f0f4ff; padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 5px solid ${player.isAvailable ? '#48bb78' : '#f56565'};">
      <h3 style="margin-top: 0; color: #333;">
        ${player.name} (${player.team}) 
        ${player.isAvailable ? '<span style="color: #48bb78;">✓ AVAILABLE</span>' : '<span style="color: #f56565;">✗ ROSTERED</span>'}
      </h3>
      <p style="font-size: 16px; margin: 10px 0;">
        <strong>Game:</strong> ${player.game}<br>
        <strong>Minutes:</strong> ${player.minutes}
      </p>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0;">
        <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${player.points}</div>
          <div style="font-size: 11px; color: #718096;">POINTS</div>
        </div>
        <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${player.rebounds}</div>
          <div style="font-size: 11px; color: #718096;">REBOUNDS</div>
        </div>
        <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${player.assists}</div>
          <div style="font-size: 11px; color: #718096;">ASSISTS</div>
        </div>
        <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${player.threePointers}</div>
          <div style="font-size: 11px; color: #718096;">3-POINTERS</div>
        </div>
        <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${player.steals}</div>
          <div style="font-size: 11px; color: #718096;">STEALS</div>
        </div>
        <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${player.blocks}</div>
          <div style="font-size: 11px; color: #718096;">BLOCKS</div>
        </div>
        <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${player.turnovers}</div>
          <div style="font-size: 11px; color: #718096;">TURNOVERS</div>
        </div>
      </div>
      <a href="https://www.espn.com/nba/boxscore/_/gameId/${player.gameId}" 
         style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
        📊 View Full Box Score
      </a>
    </div>
  `).join('');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea;">🏀 Fantasy Basketball Alert</h2>
      <p>The following player${players.length > 1 ? 's meet' : ' meets'} your threshold criteria:</p>
      ${playerCards}
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <div style="color: #666; font-size: 12px;">
        <p><strong>Your Current Thresholds:</strong></p>
        <p>Points: ${config.thresholds.points}+ | Rebounds: ${config.thresholds.rebounds}+ | Assists: ${config.thresholds.assists}+ | 3PM: ${config.thresholds.threePointers}+</p>
        <p>Steals: ${config.thresholds.steals}+ | Blocks: ${config.thresholds.blocks}+ | Turnovers: ${config.thresholds.turnovers} max</p>
        <p style="margin-top: 15px;">
          <em>Sent at ${new Date().toLocaleString()}</em><br>
          Fantasy Basketball Monitor
        </p>
      </div>
    </div>
  `;
  
  try {
    await emailTransporter.sendMail({
      from: config.email.from.user,
      to: config.email.to,
      subject: subject,
      html: html
    });
    
    console.log(`✅ Alert email sent for ${players.length} player(s)`);
    players.forEach(p => console.log(`   📧 ${p.name}`));
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
  }
}

// ============================================
// FETCH TODAY'S GAMES
// ============================================
async function fetchTodayGames() {
  try {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
    const response = await axios.get(url);
    const games = response.data.events || [];
    
    return games.map(g => {
      const comp = g.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === "home");
      const away = comp?.competitors?.find(c => c.homeAway === "away");
      
      return {
        id: g.id,
        name: g.name,
        shortName: g.shortName,
        status: g.status?.type?.description || "Scheduled",
        homeTeam: home?.team?.abbreviation || '',
        awayTeam: away?.team?.abbreviation || ''
      };
    });
  } catch (error) {
    console.error('Error fetching games:', error.message);
    return [];
  }
}

// ============================================
// PROCESS GAME DATA
// ============================================
async function processGame(gameId, gameName) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
    const response = await axios.get(url);
    const gameData = response.data;
    
    if (!gameData.boxscore || !gameData.boxscore.players) {
      return [];
    }
    
    const alertPlayers = [];
    
    gameData.boxscore.players.forEach(team => {
      const teamName = team.team.displayName;
      
      if (team.statistics && team.statistics[0] && team.statistics[0].athletes) {
        team.statistics[0].athletes.forEach(athlete => {
          const stats = athlete.stats;
          const playerId = athlete.athlete.id;
          const playerName = athlete.athlete.displayName;
          
          const playerStats = {
            id: playerId,
            name: playerName,
            team: teamName,
            game: gameName,
            gameId: gameId,
            minutes: stats[0] || '0',
            points: parseInt(stats[13]) || 0,
            rebounds: parseInt(stats[6]) || 0,
            assists: parseInt(stats[7]) || 0,
            threePointers: stats[2] ? parseInt(stats[2].split('-')[0]) : 0,
            steals: parseInt(stats[8]) || 0,
            blocks: parseInt(stats[9]) || 0,
            turnovers: parseInt(stats[10]) || 0
          };
          
          // Check if meets thresholds
          if (meetsThresholds(playerStats)) {
            // Check roster status
            const isRostered = rosteredPlayerIds.some(id => String(id) === String(playerId));
            playerStats.isAvailable = !isRostered;
            
            // Only alert for available players (or all if no roster loaded)
            if (playerStats.isAvailable || rosteredPlayerIds.length === 0) {
              // Check if we've already alerted about this player today
              const alertKey = `${playerId}-${new Date().toDateString()}`;
              if (!alertedPlayers.has(alertKey)) {
                alertPlayers.push(playerStats);
                alertedPlayers.add(alertKey);
              }
            }
          }
        });
      }
    });
    
    return alertPlayers;
  } catch (error) {
    console.error(`Error processing game ${gameId}:`, error.message);
    return [];
  }
}

// ============================================
// CHECK THRESHOLDS
// ============================================
function meetsThresholds(player) {
  const t = config.thresholds;
  return (
    player.points >= t.points &&
    player.rebounds >= t.rebounds &&
    player.assists >= t.assists &&
    player.threePointers >= t.threePointers &&
    player.steals >= t.steals &&
    player.blocks >= t.blocks &&
    player.turnovers <= t.turnovers
  );
}

// ============================================
// CHECK IF WITHIN GAME TIME WINDOW
// ============================================
function isWithinGameTime() {
  if (!config.monitoring.onlyDuringGameTimes) return true;
  
  const now = new Date().toLocaleString('en-US', { timeZone: config.monitoring.timezone });
  const currentTime = new Date(now);
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const currentTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  const [startHour, startMin] = config.monitoring.gameTimeStart.split(':').map(Number);
  const [endHour, endMin] = config.monitoring.gameTimeEnd.split(':').map(Number);
  
  const currentMinutes = hours * 60 + minutes;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

// ============================================
// MAIN MONITORING LOOP
// ============================================
async function monitorGames() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Checking games at ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));
  
  if (!isWithinGameTime()) {
    console.log('⏰ Outside game time window - skipping check');
    return;
  }
  
  const games = await fetchTodayGames();
  
  if (games.length === 0) {
    console.log('📅 No games scheduled for today');
    return;
  }
  
  console.log(`🏀 Found ${games.length} game(s) today`);
  games.forEach(g => console.log(`   ${g.shortName} - ${g.status}`));
  
  const allAlerts = [];
  
  for (const game of games) {
    console.log(`\n   Analyzing ${game.shortName}...`);
    const alerts = await processGame(game.id, game.shortName);
    allAlerts.push(...alerts);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (allAlerts.length > 0) {
    console.log(`\n🚨 ${allAlerts.length} NEW ALERT(S)!`);
    allAlerts.forEach(p => {
      console.log(`   ${p.isAvailable ? '✅' : '❌'} ${p.name}: ${p.points}pts, ${p.rebounds}reb, ${p.assists}ast`);
    });
    
    await sendAlertEmail(allAlerts);
  } else {
    console.log('\n✓ No new alerts this check');
  }
}

// ============================================
// START MONITORING
// ============================================
async function startMonitoring() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      FANTASY BASKETBALL MONITOR - STARTING                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Configuration:');
  console.log(`   League ID: ${config.espn.leagueId}`);
  console.log(`   Check Interval: ${config.monitoring.checkIntervalMinutes} minutes`);
  console.log(`   Game Time Window: ${config.monitoring.gameTimeStart} - ${config.monitoring.gameTimeEnd} ${config.monitoring.timezone}`);
  console.log(`   Alert Email: ${config.email.to}\n`);
  
  console.log('🎯 Thresholds:');
  console.log(`   Points: ${config.thresholds.points}+ | Rebounds: ${config.thresholds.rebounds}+ | Assists: ${config.thresholds.assists}+`);
  console.log(`   3PM: ${config.thresholds.threePointers}+ | Steals: ${config.thresholds.steals}+ | Blocks: ${config.thresholds.blocks}+`);
  console.log(`   Turnovers: ${config.thresholds.turnovers} max\n`);
  
  // Load roster
  loadRosterData();
  
  // Setup email
  if (!setupEmail()) {
    console.error('Cannot start - email setup failed');
    process.exit(1);
  }
  
  console.log('✅ Monitor started! Press Ctrl+C to stop.\n');
  
  // Run immediately
  await monitorGames();
  
  // Then run on interval
  const intervalMs = config.monitoring.checkIntervalMinutes * 60 * 1000;
  setInterval(async () => {
    await monitorGames();
  }, intervalMs);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping monitor... Goodbye!\n');
  process.exit(0);
});

// Start the monitor
startMonitoring().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});