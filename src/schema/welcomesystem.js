const mongoose = require("mongoose");

const Schema = mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  data: {
    name: String,
    region: String,
    owner: {
      id: String,
      tag: String,
    },
    joinedAt: Date,
    leftAt: Date,
    bots: {
      type: Number,
      default: 0,
    },
  },
  welcome: {
    autodel: {
      type: Number,
      default: 0,
    },
    enabled: Boolean,
    channel: String,
    content: String,
    embed: {
      enabled: {
        type: Boolean,
        default: false,
      },
      image: {
        type: String,
        default: "", // Can store custom URLs or placeholders like {server_icon}
      },
      description: String,
      color: String,
      title: String,
      thumbnail: {
        type: String,
        default: "", // Can store custom URLs or placeholders like {server_icon}
      },
      footer: String,
    },
    dynamicImages: {
      enabled: {
        type: Boolean,
        default: false,
      },
      attachedId: {
        type: String,
        default: "default",
      },
      templates: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },
    },
  },
});

const Model = mongoose.model("guild", Schema);

module.exports = {
  getSettings: async (guild) => {
    let guildData = await Model.findOne({ _id: guild.id });
    if (!guildData) {
      guildData = new Model({
        _id: guild.id,
        data: {
          name: guild.name,
          region: guild.preferredLocale,
          owner: {
            id: guild.ownerId,
            tag: guild.members.cache.get(guild.ownerId)?.user.tag,
          },
          joinedAt: guild.joinedAt,
        },
      });
      if (!guild.id) {
        throw new Error("Guild ID is undefined");
      }
      await guildData.save();
    }
    return guildData;
  },
};
