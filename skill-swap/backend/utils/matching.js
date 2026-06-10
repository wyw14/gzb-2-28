function calculateMatchScore(user1Skills, user2Skills, user1Prefs, user2Prefs) {
  let score = 0;
  let maxScore = 0;

  const user1Teach = user1Skills.filter(s => s.type === 'teach').map(s => s.name.toLowerCase());
  const user1Learn = user1Skills.filter(s => s.type === 'learn').map(s => s.name.toLowerCase());
  const user2Teach = user2Skills.filter(s => s.type === 'teach').map(s => s.name.toLowerCase());
  const user2Learn = user2Skills.filter(s => s.type === 'learn').map(s => s.name.toLowerCase());

  maxScore += 40;
  const match1to2 = user1Teach.filter(t => user2Learn.some(l => l.includes(t) || t.includes(l))).length;
  if (match1to2 > 0) score += 20 + (match1to2 * 5);

  maxScore += 40;
  const match2to1 = user2Teach.filter(t => user1Learn.some(l => l.includes(t) || t.includes(l))).length;
  if (match2to1 > 0) score += 20 + (match2to1 * 5);

  maxScore += 15;
  if (user1Prefs.location && user2Prefs.location) {
    if (user1Prefs.location.city === user2Prefs.location.city) {
      score += 15;
    } else if (user1Prefs.location.province === user2Prefs.location.province) {
      score += 8;
    }
  } else {
    score += 10;
  }

  maxScore += 15;
  if (user1Prefs.time && user2Prefs.time) {
    const timeOverlap = user1Prefs.time.filter(t => user2Prefs.time.includes(t)).length;
    if (timeOverlap > 0) {
      score += 10 + (timeOverlap * 2);
    }
  } else {
    score += 10;
  }

  maxScore += 10;
  if (user1Prefs.onlinePreference === user2Prefs.onlinePreference) {
    score += 10;
  } else if (user1Prefs.onlinePreference === 'both' || user2Prefs.onlinePreference === 'both') {
    score += 5;
  }

  return Math.min(100, Math.round((score / maxScore) * 100));
}

function findMatchesForUser(userId, allUsers, allSkills) {
  const userSkills = allSkills.filter(s => s.userId === userId);
  const user = allUsers.find(u => u.id === userId);
  if (!user || userSkills.length === 0) return [];

  const matches = [];
  const otherUsers = allUsers.filter(u => u.id !== userId);

  for (const other of otherUsers) {
    const otherSkills = allSkills.filter(s => s.userId === other.id);
    if (otherSkills.length === 0) continue;

    const score = calculateMatchScore(
      userSkills,
      otherSkills,
      user.preferences || {},
      other.preferences || {}
    );

    if (score >= 30) {
      const matchedSkills = getMatchedSkills(userSkills, otherSkills);
      matches.push({
        userId: other.id,
        user: {
          id: other.id,
          username: other.username,
          avatar: other.avatar,
          bio: other.bio,
          rating: other.rating,
          exchangeCount: other.exchangeCount
        },
        score,
        matchedSkills,
        createdAt: new Date().toISOString()
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

function getMatchedSkills(user1Skills, user2Skills) {
  const user1Teach = user1Skills.filter(s => s.type === 'teach');
  const user1Learn = user1Skills.filter(s => s.type === 'learn');
  const user2Teach = user2Skills.filter(s => s.type === 'teach');
  const user2Learn = user2Skills.filter(s => s.type === 'learn');

  const iCanTeach = user1Teach.filter(t =>
    user2Learn.some(l => l.name.toLowerCase().includes(t.name.toLowerCase()) ||
                        t.name.toLowerCase().includes(l.name.toLowerCase()))
  );

  const iCanLearn = user2Teach.filter(t =>
    user1Learn.some(l => l.name.toLowerCase().includes(t.name.toLowerCase()) ||
                        t.name.toLowerCase().includes(l.name.toLowerCase()))
  );

  return {
    iCanTeach: iCanTeach.map(s => s.name),
    iCanLearn: iCanLearn.map(s => s.name)
  };
}

module.exports = {
  calculateMatchScore,
  findMatchesForUser
};
