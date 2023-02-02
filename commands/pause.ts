import { i18n } from "../utils/i18n";
import { canModifyQueue } from "../utils/queue";
import { bot } from "../index";
import { Message, User } from "discord.js";

export default {
  name: "pause",
  description: i18n.__("pause.description"),
  execute(message: Message, user: User) {
    const queue = bot.queues.get(message.guild!.id);

    if (!queue) return message.reply(i18n.__("pause.errorNotQueue")).catch(console.error);

    if (!canModifyQueue(message.member!)) return i18n.__("common.errorNotChannel");

    const username = user != undefined ? user.username : message.author.username;

    if (queue.player.pause()) {
      queue.textChannel.send(i18n.__mf("pause.result", { author: username })).catch(console.error);

      return true;
    }
  }
};
