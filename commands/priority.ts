import { Message, PermissionsBitField } from "discord.js";
import { bot } from "../index";
import { Song } from "../structs/Song";
import { i18n } from "../utils/i18n";
import { getErrorMessage } from "../utils/errorMessage";
import { playlistPattern } from "../utils/patterns";
export default {
  name: "priority",
  cooldown: 5,
  description: i18n.__("priority.description"),
  permissions: [
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.ManageMessages
  ],
  async execute(message: Message, args: string[]) {
    const { channel } = message.member!.voice;

    if (!channel) return message.reply(i18n.__("play.errorNotChannel")).catch(console.error);

    const queue = bot.queues.get(message.guild!.id);

    if (queue && channel.id !== queue.connection.joinConfig.channelId)
      return message
        .reply(i18n.__mf("play.errorNotInSameChannel", { user: bot.client.user!.username }))
        .catch(console.error);

    if (!args.length) return message.reply(i18n.__mf("priority.usageReply", { prefix: bot.prefix })).catch(console.error);
    if (!queue) return message.reply(i18n.__mf("priority.noListReply", { prefix: bot.prefix })).catch(console.error);

    const url = args[0];

    const loadingReply = await message.reply("⏳ Loading...");

    // Start the playlist if playlist url was provided
    if (playlistPattern.test(args[0])) {
      await loadingReply.delete();
      return bot.commands.get("playlist")!.execute(message, args);
    }

    let song;

    try {
      song = await Song.from(url, args.join(" "));
    } catch (error) {
      console.error(error);
      return message.reply(getErrorMessage(error)).catch(console.error);
    } finally {
      await loadingReply.delete();
    }

    queue.enqueuePrio(song);

    return queue.textChannel
      .send(i18n.__mf("priority.added", { title: song.title }))
      .catch(console.error);
  }
};
