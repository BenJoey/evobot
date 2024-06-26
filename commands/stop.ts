import { Message, User } from "discord.js";
import { bot } from "../index";
import { i18n } from "../utils/i18n";
import { canModifyQueue } from "../utils/queue";

export default {
  name: "stop",
  description: i18n.__("stop.description"),
  execute(message: Message, user: User) {
    const queue = bot.queues.get(message.guild!.id);

    if (!queue) return message.reply(i18n.__("stop.errorNotQueue")).catch(console.error);
    if (!canModifyQueue(message.member!)) return i18n.__("common.errorNotChannel");

    queue.stop();

    const username = (user !== undefined && user.hasOwnProperty('username')) ? user.username : message.author.username;

    queue.textChannel.send(i18n.__mf("stop.result", { author: username })).catch(console.error);
  }
};
