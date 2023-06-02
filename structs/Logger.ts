import { config } from "../utils/config";
import { TextChannel } from "discord.js";
const fs = require('fs');

export class Logger {
    private static myInstance:Logger;
    private latestLogs:string[] = [];
    private logSize:number;

    public constructor() {
        this.logSize = 200; //config.MAX_LOG_SIZE;
    }

    public static getInstance(): Logger {
        if(!this.myInstance) this.myInstance = new Logger();
        return this.myInstance;
    }

    public logMessage(message:string, module:string = ""): void {
        if(this.latestLogs.length >= this.logSize) {
            this.latestLogs.shift();
        }

        this.latestLogs.push(module + " >> " + message);
    }

    public async sendLogToChannel(channel:TextChannel): Promise<void> {
        try {
            let fname:string = "log.txt";
            fs.appendFile(fname, this.latestLogs.join('\n'), function (err:any) {
                if(err) {
                    console.log("Error happened during creating log file");
                }
            });

            await channel.send({
                files: [fname]
            });
            fs.unlinkSync(fname);
        } catch(err:any) {
            channel.send("Error happened during sending log file :" + err);
        }
    }
}