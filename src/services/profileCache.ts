// In-Memory Global Profile Cache for Instant Tab Switching
let cachedProfileData: any = null;
let cachedActiveUser: any = null;

export const setCachedProfile = (profile: any) => {
  cachedProfileData = profile;
};

export const getCachedProfile = () => {
  return cachedProfileData;
};

export const setCachedUser = (user: any) => {
  cachedActiveUser = user;
};

export const getCachedUser = () => {
  return cachedActiveUser;
};

export const clearProfileCache = () => {
  cachedProfileData = null;
  cachedActiveUser = null;
};
