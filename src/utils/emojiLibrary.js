const fallbackEmojis = require("./emoji.json");

const API_BASE = "https://discord.com/api/v10";
const DEFAULT_TIMEOUT_MS = 10000;

const EMOJI_ALIASES = {
  playing: "Playing",
  stop: "resume",
  skip: "forward",
  addsong: "autoplay",
  replay: "loop",
  role: "roles",
  delete: "del",
  remove: "del",
  tick: "yes",
  cross: "no",
  corss: "no",
  warning: "warn",
  jump: "join",
  information: "info",
  moderation: "mod",
  antinuke: "anti",
  web: "utility",
  fams: "Fams",
  owner: "Owners",
  dev: "OxP",
  admin: "Admin",
  staff: "Staffs",
  partner: "Partners",
  vip: "Vips",
  friend: "Homies",
  gfriend: "Homies",
  bug: "Mods",
  os: "ownerspecial",
  specialone: "special",
  loveone: "love",
  insta: "Insta",
  instagram: "Insta",
  snap: "Snap",
  musicspecial: "music",
  noprefix: "premium",
  twitter: "discord",
};

for (const letter of "abcdefghijklmnopqrstuvwxyz") {
  EMOJI_ALIASES[letter] = letter === "h" ? "h_simpler" : `${letter.toUpperCase()}_simper`;
}

async function loadEmojiLibrary(client) {
  const settings = client.config?.emojiLibrary || {};
  const url = settings.url;
  const timeoutMs = Number(settings.timeoutMs || DEFAULT_TIMEOUT_MS);

  if (!url) {
    client.logger?.log("[EmojiLibrary] No remote emoji library URL configured.", "warn");
    return fallbackEmojis;
  }

  try {
    const token = client.token || client.config?.token;
    if (!token) throw new Error("Missing bot token.");

    const library = await fetchJson(url, timeoutMs);
    const libraryEmojis = Array.isArray(library.emojis) ? library.emojis : [];
    const applicationId = await getApplicationId(token, client.config?.clientId, timeoutMs);
    const applicationEmojis = await listApplicationEmojis(token, applicationId, timeoutMs);
    const byName = new Map(applicationEmojis.filter((emoji) => emoji.name).map((emoji) => [emoji.name, emoji]));
    const resolved = { ...fallbackEmojis };
    const imageUrls = {};
    const missing = [];

    for (const item of libraryEmojis) {
      if (!item?.name) continue;
      if (item.url) imageUrls[item.name] = item.url;

      const emoji = byName.get(item.name);
      if (!emoji?.id) {
        missing.push(item.name);
        continue;
      }

      const value = formatEmoji(emoji.name, emoji.id, emoji.animated);
      resolved[item.name] = value;
      resolved[item.name.toLowerCase()] = value;
    }

    for (const [key, remoteName] of Object.entries(EMOJI_ALIASES)) {
      const emoji = byName.get(remoteName);
      if (emoji?.id) resolved[key] = formatEmoji(emoji.name, emoji.id, emoji.animated);
    }

    client.emojiImages = imageUrls;
    client.config.emojis = resolved;
    client.logger?.log(
      `[EmojiLibrary] Loaded ${Object.keys(resolved).length} emoji keys from ${url}${missing.length ? `; missing application emojis: ${missing.join(", ")}` : ""}.`,
      missing.length ? "warn" : "ready",
    );

    return resolved;
  } catch (error) {
    client.logger?.log(`[EmojiLibrary] Failed to load remote emojis: ${error.message || error}`, "warn");
    return fallbackEmojis;
  }
}

async function getApplicationId(token, fallbackId, timeoutMs) {
  const application = await discordRequest(
    token,
    "/oauth2/applications/@me",
    { method: "GET" },
    timeoutMs,
  ).catch(() => null);

  if (application?.id) return application.id;
  if (fallbackId) return fallbackId;

  const user = await discordRequest(token, "/users/@me", { method: "GET" }, timeoutMs);
  return user.id;
}

async function listApplicationEmojis(token, applicationId, timeoutMs) {
  const response = await discordRequest(
    token,
    `/applications/${applicationId}/emojis`,
    { method: "GET" },
    timeoutMs,
  );
  return Array.isArray(response?.items) ? response.items : [];
}

async function discordRequest(token, endpoint, options, timeoutMs) {
  const response = await fetchWithTimeout(
    `${API_BASE}${endpoint}`,
    {
      ...options,
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent": "DiscordBot (RemoteEmojiLibrary, 1.0)",
        ...(options.headers || {}),
      },
    },
    timeoutMs,
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord ${response.status}: ${body.slice(0, 300)}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function fetchJson(url, timeoutMs) {
  const response = await fetchWithTimeout(url, {}, timeoutMs);
  if (!response.ok) throw new Error(`Emoji library ${response.status}`);
  return response.json();
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function formatEmoji(name, id, animated) {
  return `<${animated ? "a" : ""}:${name}:${id}>`;
}

module.exports = {
  loadEmojiLibrary,
};
