import { i18n } from "../utils/i18n";
import { isBotOwner } from "../utils/checkPermissions";
import { Message, User, GuildMember } from "discord.js";
import { bot } from "../index";

export default {
  name: "kill",
  description: i18n.__("kill.description"),
  execute(message: Message, user: User) {
    let member = message.member as GuildMember;

    if (isBotOwner(member.user.username)) {
      bot.queues.forEach(function (q) {
        q.stop();
      });
    } else {
      message.reply(i18n.__("common.adminOnly")).catch(console.error);
    }
  }
};
