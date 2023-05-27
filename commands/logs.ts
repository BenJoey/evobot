import { i18n } from "../utils/i18n";
import { Message, User, TextChannel } from "discord.js";
import { Logger } from "../structs/Logger"

export default {
  name: "logs",
  description: i18n.__("logs.description"),
  execute(message: Message, user: User) {

    Logger.getInstance().sendLogToChannel(message.channel as TextChannel);
  }
};
