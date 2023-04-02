import { Message } from "discord.js";
import { bot } from "../index";
import { Song } from "../structs/Song";
import { i18n } from "../utils/i18n";
import { canModifyQueue } from "../utils/queue";

const pattern = /^[0-9]{1,2}(\s*,\s*[0-9]{1,2})*$/;

export default {
  name: "removefrom",
  description: i18n.__("removefrom.description"),
  execute(message: Message, args: any[]) {
    const queue = bot.queues.get(message.guild!.id);

    if (!queue) return message.reply(i18n.__("removefrom.errorNotQueue")).catch(console.error);

    if (!canModifyQueue(message.member!)) return i18n.__("common.errorNotChannel");

    if (!args.length) return message.reply(i18n.__mf("removefrom.usageReply", { prefix: bot.prefix }));

    const removeArgs = args.join("");

    if (pattern.test(removeArgs)) {
      const startIndex:number = +removeArgs - 1;
      const removedCount:number = queue.songs.length - startIndex;
      queue.songs.length = startIndex;

      queue.textChannel.send(
        i18n.__mf("removefrom.result", {
          count: removedCount,
          author: message.author.username
        })
      );
    } else {
      return message.reply(i18n.__mf("removefrom.usageReply", { prefix: bot.prefix }));
    }
  }
};
