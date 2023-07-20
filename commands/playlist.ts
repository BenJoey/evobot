import { DiscordGatewayAdapterCreator, joinVoiceChannel } from "@discordjs/voice";
import { Message, EmbedBuilder, PermissionsBitField } from "discord.js";
import { bot } from "../index";
import { MusicQueue } from "../structs/MusicQueue";
import { Playlist } from "../structs/Playlist";
import { i18n } from "../utils/i18n";
import { Logger } from "../structs/Logger";

export default {
  name: "playlist",
  cooldown: 5,
  aliases: ["pl"],
  description: i18n.__("playlist.description"),
  permissions: [
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.ManageMessages
  ],
  async execute(message: Message, args: any[]) {
    Logger.getInstance().logMessage("Playlist command received", "commands.playlist");
    const { channel } = message.member!.voice;

    const queue = bot.queues.get(message.guild!.id);

    if (!args.length)
      return message.reply(i18n.__mf("playlist.usagesReply", { prefix: bot.prefix })).catch(console.error);

    if (!channel) return message.reply(i18n.__("playlist.errorNotChannel")).catch(console.error);

    if (queue && channel.id !== queue.connection.joinConfig.channelId)
      return message
        .reply(i18n.__mf("play.errorNotInSameChannel", { user: message.client.user!.username }))
        .catch(console.error);

    let playlist;

    try {
      Logger.getInstance().logMessage("Searching for playlist", "commands.playlist");
      playlist = await Playlist.from(args[0], args.join(" "));
    } catch (error) {
      Logger.getInstance().logMessage("Error during playlist command", "commands.playlist", error);

      return message.reply(i18n.__("playlist.errorNotFoundPlaylist")).catch(console.error);
    }

    Logger.getInstance().logMessage("Adding playlist to the queue", "commands.playlist");
    if (queue) {
      queue.songs.push(...playlist.videos);
    } else {
      const newQueue = new MusicQueue({
        message,
        connection: joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
        })
      });

      bot.queues.set(message.guild!.id, newQueue);
      newQueue.songs.push(...playlist.videos);

      newQueue.processQueue();
    }

    let playlistEmbed = new EmbedBuilder()
      .setTitle(`${playlist.data.title}`)
      .setURL(playlist.data.url!)
      .setColor("#F8AA2A")
      .setTimestamp();

    message
      .reply({
        content: i18n.__mf("playlist.startedPlaylist", { author: message.author.username }),
        embeds: [playlistEmbed]
      })
      .catch(console.error);
  }
};
