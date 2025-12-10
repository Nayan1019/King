const GENDER_MAP = new Map([
  [1, "FEMALE"],
  ["1", "FEMALE"],
  ["FEMALE", "FEMALE"],
  ["female", "FEMALE"],
  [2, "MALE"],
  ["2", "MALE"],
  ["MALE", "MALE"],
  ["male", "MALE"]
]);

function normalizeGender(value) {
  if (value === undefined || value === null) return null;
  const normalized = GENDER_MAP.get(value) || GENDER_MAP.get(value.toString()?.toUpperCase());
  return normalized || null;
}

async function getProfileFromThread(threadID, userID) {
  if (!threadID || !global.Thread) return {};
  try {
    const thread = await global.Thread.findOne(
      { threadID },
      { users: 1 }
    ).lean();

    if (!thread || !Array.isArray(thread.users)) return {};

    const user = thread.users.find(
      userEntry => userEntry?.id?.toString() === userID || userEntry?.userID?.toString() === userID
    );

    if (!user) return {};

    return {
      gender: normalizeGender(user.gender),
      name: user.name || null
    };
  } catch (error) {
    console.warn(`[gender] Thread lookup failed: ${error.message}`);
    return {};
  }
}

async function getProfileFromThreadInfo(api, threadID, userID) {
  if (!api?.getThreadInfo || !threadID) return {};
  try {
    const threadInfo = await new Promise((resolve, reject) => {
      api.getThreadInfo(threadID, (err, info) => (err ? reject(err) : resolve(info)));
    });

    if (!threadInfo?.userInfo) return {};
    const userInfo = threadInfo.userInfo.find(info => info?.id?.toString() === userID);
    if (!userInfo) return {};

    return {
      gender: normalizeGender(userInfo.gender),
      name: userInfo.name || null
    };
  } catch (error) {
    console.warn(`[gender] getThreadInfo failed: ${error.message}`);
    return {};
  }
}

async function getProfileFromUserInfo(api, userID) {
  if (!api?.getUserInfo) return {};
  try {
    const response = await new Promise((resolve, reject) => {
      api.getUserInfo(userID, (err, info) => (err ? reject(err) : resolve(info)));
    });

    const user = response?.[userID];
    if (!user) return {};

    return {
      gender: normalizeGender(user.gender),
      name: user.name || null
    };
  } catch (error) {
    console.warn(`[gender] getUserInfo failed: ${error.message}`);
    return {};
  }
}

async function resolveUserProfile({ userID, threadID, api }) {
  if (!userID) return { gender: null, name: null };

  const sources = [
    getProfileFromThread(threadID, userID),
    getProfileFromThreadInfo(api, threadID, userID),
    getProfileFromUserInfo(api, userID)
  ];

  let profile = { gender: null, name: null };

  for (const fetchProfile of sources) {
    const result = await fetchProfile;
    profile = {
      gender: profile.gender || result.gender || null,
      name: profile.name || result.name || null
    };

    if (profile.gender && profile.name) break;
  }

  return profile;
}

async function resolveUserGender({ userID, threadID, api }) {
  const profile = await resolveUserProfile({ userID, threadID, api });
  return profile.gender;
}

module.exports = {
  resolveUserProfile,
  resolveUserGender,
  normalizeGender
};
