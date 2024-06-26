import { Message, User } from "discord.js";
import { bot } from "../index";
import { i18n } from "../utils/i18n";
import { canModifyQueue } from "../utils/queue";

export default {
  name: "resume",
  aliases: ["r"],
  description: i18n.__("resume.description"),
  execute(message: Message, user: User) {
    const queue = bot.queues.get(message.guild!.id);

    if (!queue) return message.reply(i18n.__("resume.errorNotQueue")).catch(console.error);
    if (!canModifyQueue(message.member!)) return i18n.__("common.errorNotChannel");

    const username = (user !== undefined && user.hasOwnProperty('username')) ? user.username : message.author.username;

    if (queue.player.unpause()) {
      queue.textChannel
        .send(i18n.__mf("resume.resultNotPlaying", { author: username }))
        .catch(console.error);

      return true;
    }

    message.reply(i18n.__("resume.errorPlaying")).catch(console.error);
    return false;
  }
};
