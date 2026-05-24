const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const clientEventsPath = path.join(__dirname, "../events/Client");
  let totalEvents = 0;

  fs.readdirSync(clientEventsPath)
    .filter((file) => file.endsWith(".js"))
    .forEach((file) => {
    const event = require(path.join(clientEventsPath, file));
    if (!event?.name || typeof event.run !== "function") {
      client.logger.log(`Skipped invalid client event: ${file}`, "warn");
      return;
    }

    const listener = (...args) => event.run(client, ...args);
    if (event.once) client.once(event.name, listener);
    else client.on(event.name, listener);
    totalEvents++;
  });

  client.logger.log(`Client Events Loaded: ${totalEvents}`, "event");
};
