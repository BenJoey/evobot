import { canModifyQueue } from "../utils/queue";
import { i18n } from "../utils/i18n";
import { Message, User } from "discord.js";
import { bot } from "../index";

export default {
  name: "shuffle",
  description: i18n.__("shuffle.description"),
  execute(message: Message, user: User) {
    const queue = bot.queues.get(message.guild!.id);

    if (!queue) return message.reply(i18n.__("shuffle.errorNotQueue")).catch(console.error);

    if (!canModifyQueue(message.member!)) return i18n.__("common.errorNotChannel");

    let songs = queue.songs;

    for (let i = songs.length - 1; i > 1; i--) {
      let j = 1 + Math.floor(Math.random() * i);
      [songs[i], songs[j]] = [songs[j], songs[i]];
    }

    queue.songs = songs;

    const username = user != undefined ? user.username : message.author.username;

    queue.textChannel.send(i18n.__mf("shuffle.result", { author: username })).catch(console.error);
  }
};
