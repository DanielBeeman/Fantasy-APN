// Historical Season Roster Fetcher
// Test if we can retrieve roster data from completed 2025 season

const axios = require('axios');
const fs = require('fs');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  leagueId: '1497752245',
  currentSeason: 2026, // Current/upcoming season (public)
  historicalSeason: 2025, // Last completed season (requires cookies)
  // Cookies - IMPORTANT: Include the curly braces for SWID
  swid: '{2822CD92-BE85-41A0-A2CD-92BE8541A0EE}',
  espnS2: 'AECrAZac1WNrYUpFNOPyJhaw%2FBFOrz1Rqcq4r7%2Fhmk23dfOHwVFdZGyE5ffBXfV4vqchg32RPL2J0aujAafedFb2TUMR4xBIYRC%2ByVKk57LF8nMs%2FJUlXRcF6Hz1%2FUStAY2fMuHFZyjKhTOa%2FMlKKKflOOoC%2FXSggMmxvmSfCGkEYPZS2M%2Bk0gu7UmCQhektT8hS7V2X%2FsVZ62hjJagvdjhrp8euagnMuAYtGKuj1b3wKQhk8t0hLMBCzOoTzwPMPerBkVNl01%2FRjHXOf9g4pZfmUds0v%2F1J6h7bgC2SndGNtA%3D%3D'
};

// ============================================
// FETCH FUNCTIONS (Using Working Format)
// ============================================

async function fetchLeagueData(seasonYear, view) {
  try {
    const baseUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${seasonYear}/segments/0/leagues/${CONFIG.leagueId}`;
    const url = `${baseUrl}?view=${view}`;
    
    const headers = {
      Cookie: `SWID=${CONFIG.swid}; espn_s2=${CONFIG.espnS2}`
    };
    
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${view} for ${seasonYear}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      if (error.response.data) {
        console.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    return null;
  }
}

async function fetchSeasonRosters(seasonYear) {
  console.log(`\nFetching season ${seasonYear} data...`);
  
  // Fetch teams first
  const teamsData = await fetchLeagueData(seasonYear, 'mTeam');
  if (!teamsData || !teamsData.teams) {
    console.log('❌ Could not fetch teams data');
    return null;
  }
  
  // Fetch rosters
  const rosterData = await fetchLeagueData(seasonYear, 'mRoster');
  if (!rosterData) {
    console.log('❌ Could not fetch roster data');
    return null;
  }
  
  return {
    teams: teamsData.teams,
    rosters: rosterData.teams,
    settings: teamsData.settings,
    status: teamsData.status
  };
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

function analyzeRosterData(data, seasonYear) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYZING ${seasonYear} SEASON DATA`);
  console.log('='.repeat(60));
  
  if (!data) {
    console.log('❌ No data received');
    return { hasRosters: false, playerCount: 0 };
  }
  
  console.log('\n📋 Basic Info:');
  console.log(`  League Name: ${data.settings?.name || 'N/A'}`);
  console.log(`  Number of Teams: ${data.teams?.length || 0}`);
  
  if (data.status) {
    console.log(`  Is Active: ${data.status.isActive}`);
    console.log(`  Current Matchup Period: ${data.status.currentMatchupPeriod}`);
    console.log(`  Latest Scoring Period: ${data.status.latestScoringPeriod}`);
  }
  
  let totalPlayers = 0;
  let teamsWithRosters = 0;
  
  if (data.teams && data.teams.length > 0) {
    console.log('\n📊 Team Roster Analysis:');
    console.log('-'.repeat(60));
    
    data.teams.forEach((team, idx) => {
      const teamName = team.name || `${team.location || ''} ${team.nickname || ''}`.trim() || `Team ${idx + 1}`;
      const abbrev = team.abbrev || 'N/A';
      
      // Find roster for this team
      const teamRoster = data.rosters?.find(rt => rt.id === team.id);
      const rosterEntries = teamRoster?.roster?.entries || [];
      
      if (rosterEntries.length > 0) {
        totalPlayers += rosterEntries.length;
        teamsWithRosters++;
        
        console.log(`  ${(idx + 1).toString().padStart(2)}. ${abbrev.padEnd(6)} ${teamName.padEnd(25)} ${rosterEntries.length} players`);
        
        // Show first 3 players from first team
        if (idx === 0) {
          console.log('\n     Sample Players:');
          rosterEntries.slice(0, 3).forEach(entry => {
            const player = entry.playerPoolEntry?.player;
            if (player) {
              const fullName = `${player.firstName} ${player.lastName}`;
              const proTeam = player.proTeamAbbreviation || 'FA';
              console.log(`     - ${fullName} (${proTeam}) - ESPN ID: ${entry.playerId}`);
            }
          });
          if (rosterEntries.length > 3) {
            console.log(`     ... and ${rosterEntries.length - 3} more`);
          }
        }
      } else {
        console.log(`  ${(idx + 1).toString().padStart(2)}. ${abbrev.padEnd(6)} ${teamName.padEnd(25)} ❌ No roster data`);
      }
    });
  }
  
  console.log('\n📈 Summary:');
  console.log(`  Teams with rosters: ${teamsWithRosters}/${data.teams?.length || 0}`);
  console.log(`  Total players: ${totalPlayers}`);
  
  return {
    hasRosters: teamsWithRosters > 0,
    playerCount: totalPlayers,
    teamsWithRosters: teamsWithRosters,
    fullData: data
  };
}

function extractRosteredPlayerIds(data) {
  const rosteredPlayers = new Set();
  
  if (!data || !data.rosters) return rosteredPlayers;
  
  data.rosters.forEach(team => {
    const entries = team.roster?.entries || [];
    entries.forEach(entry => {
      if (entry.playerId) {
        rosteredPlayers.add(entry.playerId);
      }
    });
  });
  
  return rosteredPlayers;
}

// ============================================
// MAIN COMPARISON
// ============================================

async function compareSeasons() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       HISTORICAL ROSTER FETCHER - SEASON COMPARISON        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`League ID: ${CONFIG.leagueId}`);
  console.log(`Historical Season: ${CONFIG.historicalSeason} (completed)`);
  console.log(`Current Season: ${CONFIG.currentSeason} (upcoming)`);
  console.log(`Authentication: ✅ Configured`);
  
  // Test 1: Fetch 2025 season (historical/completed)
  console.log('\n\n' + '█'.repeat(60));
  console.log('TEST 1: HISTORICAL SEASON (2025) - COMPLETED');
  console.log('█'.repeat(60));
  
  const data2025 = await fetchSeasonRosters(CONFIG.historicalSeason);
  const results2025 = analyzeRosterData(data2025, CONFIG.historicalSeason);
  
  if (results2025.hasRosters) {
    // Save successful response
    fs.writeFileSync('2025_season_rosters.json', JSON.stringify(data2025, null, 2));
    console.log('\n✅ 2025 roster data saved to: 2025_season_rosters.json');
    
    // Also save just the player IDs
    const playerIds2025 = extractRosteredPlayerIds(data2025);
    fs.writeFileSync('2025_rostered_player_ids.json', JSON.stringify(Array.from(playerIds2025), null, 2));
    console.log('✅ Player IDs saved to: 2025_rostered_player_ids.json');
    console.log(`   Total unique players: ${playerIds2025.size}`);
  }
  
  // Wait a bit to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Fetch 2026 season (current/upcoming)
  console.log('\n\n' + '█'.repeat(60));
  console.log('TEST 2: CURRENT SEASON (2026) - UPCOMING');
  console.log('█'.repeat(60));
  
  const data2026 = await fetchSeasonRosters(CONFIG.currentSeason);
  const results2026 = analyzeRosterData(data2026, CONFIG.currentSeason);
  
  if (results2026.hasRosters) {
    fs.writeFileSync('2026_season_rosters.json', JSON.stringify(data2026, null, 2));
    console.log('\n✅ 2026 roster data saved to: 2026_season_rosters.json');
    
    const playerIds2026 = extractRosteredPlayerIds(data2026);
    fs.writeFileSync('2026_rostered_player_ids.json', JSON.stringify(Array.from(playerIds2026), null, 2));
    console.log('✅ Player IDs saved to: 2026_rostered_player_ids.json');
    console.log(`   Total unique players: ${playerIds2026.size}`);
  }
  
  // Comparison
  console.log('\n\n' + '═'.repeat(60));
  console.log('COMPARISON RESULTS');
  console.log('═'.repeat(60));
  
  console.log(`\n2025 Season (Historical):`);
  console.log(`  ✅ Has Rosters: ${results2025.hasRosters ? 'YES' : 'NO'}`);
  console.log(`  📊 Total Players: ${results2025.playerCount}`);
  console.log(`  👥 Teams with Data: ${results2025.teamsWithRosters}`);
  
  console.log(`\n2026 Season (Current):`);
  console.log(`  ✅ Has Rosters: ${results2026.hasRosters ? 'YES' : 'NO'}`);
  console.log(`  📊 Total Players: ${results2026.playerCount}`);
  console.log(`  👥 Teams with Data: ${results2026.teamsWithRosters}`);
  
  // Conclusions
  console.log('\n\n' + '═'.repeat(60));
  console.log('DIAGNOSIS & RECOMMENDATIONS');
  console.log('═'.repeat(60));
  
  if (results2025.hasRosters && !results2026.hasRosters) {
    console.log('\n🎯 DIAGNOSIS: API Works, But Current Season Not Ready');
    console.log('\n✅ Good News:');
    console.log('   - The API and authentication work correctly');
    console.log('   - Historical data retrieves perfectly');
    console.log('   - We can extract all rostered player IDs');
    console.log('\n⚠️  Issue:');
    console.log('   - 2026 season rosters are not populated yet');
    console.log('   - This confirms it\'s a timing/sync issue with ESPN');
    console.log('\n💡 Solutions:');
    console.log('   1. Use 2025 player IDs as a starting point (saved to file)');
    console.log('   2. Check 2026 again in a few hours/days');
    console.log('   3. Build monitoring system with manual roster updates');
    console.log('   4. Add roster checking endpoint to poll periodically');
  } else if (!results2025.hasRosters && !results2026.hasRosters) {
    console.log('\n❌ DIAGNOSIS: Cannot Retrieve Rosters');
    console.log('\n⚠️  Problem:');
    console.log('   - Even historical completed season has no roster data');
    console.log('   - Authentication may be failing');
    console.log('\n💡 Solutions:');
    console.log('   1. Verify cookies are fresh and correct');
    console.log('   2. Check cookie format (SWID needs curly braces)');
    console.log('   3. Try logging into ESPN and getting new cookies');
  } else if (results2025.hasRosters && results2026.hasRosters) {
    console.log('\n✅ DIAGNOSIS: Everything Works!');
    console.log('\n🎉 Great News:');
    console.log('   - Both seasons have roster data');
    console.log('   - API is working correctly');
    console.log('   - Ready to build full monitoring system');
    console.log('   - Can automatically track rostered players');
  } else {
    console.log('\n🤔 DIAGNOSIS: Unexpected Results');
    console.log('\n   2026 has rosters but 2025 doesn\'t - this is unusual');
    console.log('   Review the JSON files to understand the data structure');
  }
  
  console.log('\n\n📁 Generated Files:');
  if (results2025.hasRosters) {
    console.log('   ✅ 2025_season_rosters.json - Full roster data');
    console.log('   ✅ 2025_rostered_player_ids.json - Just player IDs');
  }
  if (results2026.hasRosters) {
    console.log('   ✅ 2026_season_rosters.json - Full roster data');
    console.log('   ✅ 2026_rostered_player_ids.json - Just player IDs');
  }
  
  console.log('\n\n📋 Next Steps:');
  console.log('   1. Review generated JSON files');
  console.log('   2. Use player ID lists in your monitoring app');
  console.log('   3. Build threshold detection system');
  console.log('   4. Set up notification system');
  console.log('   5. Create monitoring loop for live games');
}

// Run the comparison
async function main() {
  await compareSeasons();
}

main().catch(error => {
  console.error('\n❌ Script error:', error);
});