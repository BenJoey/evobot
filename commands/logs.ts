import { i18n } from "../utils/i18n";
import { Message, User, TextChannel, GuildMember, PermissionsBitField } from "discord.js";
import { Logger } from "../structs/Logger"

export default {
  name: "logs",
  description: i18n.__("logs.description"),
  execute(message: Message, user: User) {

    let member = message.member as GuildMember;

    /*if(member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      Logger.getInstance().sendLogToChannel(message.channel as TextChannel);
    }*/
    if(["benjoe", "avenhurkatolto"].indexOf(member.user.username) > -1) {
      Logger.getInstance().sendLogToChannel(message.channel as TextChannel);
    }
    else {
      message.reply(i18n.__("common.adminOnly")).catch(console.error);
    }
  }
};
