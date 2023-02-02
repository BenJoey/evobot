import { canModifyQueue } from "../utils/queue";
import { i18n } from "../utils/i18n";
import { Message, User } from "discord.js";
import { bot } from "../index";

export default {
  name: "skip",
  aliases: ["s"],
  description: i18n.__("skip.description"),
  execute(message: Message, user: User) {
    const queue = bot.queues.get(message.guild!.id);

    if (!queue) return message.reply(i18n.__("skip.errorNotQueue")).catch(console.error);

    if (!canModifyQueue(message.member!)) return i18n.__("common.errorNotChannel");

    queue.player.stop(true);

    const username = user != undefined ? user.username : message.author.username;

    queue.textChannel.send(i18n.__mf("skip.result", { author: username })).catch(console.error);
  }
};
