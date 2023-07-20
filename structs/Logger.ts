import { config } from "../utils/config";
import { TextChannel } from "discord.js";
const fs = require('fs');

export class Logger {
    private static myInstance:Logger;
    private maxLogSize:number;
    private lineCount:number = 0;
    private fileCount:number;
    private currentLogFile:string = "";

    public constructor() {
        this.maxLogSize = 500; //config.MAX_LOG_SIZE;
        try{
            this.fileCount = fs.readdirSync('./logs', () => {}).length;
        } catch(err:any){
            this.fileCount = 0;
        }
        this.createNewLogFile();
    }

    public static getInstance(): Logger {
        if(!this.myInstance) this.myInstance = new Logger();
        return this.myInstance;
    }

    public logMessage(message:string, module:string = "Unknown", extra:any = null): void {
        try {
            if(this.lineCount > this.maxLogSize) this.createNewLogFile();
            let extraStr = extra ? this.getExtraStr(extra) : "";
            let logStr = module + " >> " + message + extraStr;

            fs.appendFile(this.currentLogFile, '\n' + logStr, function (err:any) {
                if (err) throw err;
            });
            
            this.lineCount++;
        } catch (err:any) {
            console.log(err);
        }
    }

    public async sendLogToChannel(channel:TextChannel): Promise<void> {
        try {
            var zipper = require('zip-local');
            zipper.sync.zip("./logs/").compress().save("logs.zip");

            await channel.send({
                files: ["logs.zip"]
            });

            fs.unlinkSync("logs.zip");
            const fsExtra = require('fs-extra');
            fsExtra.emptyDirSync("logs/");
            this.fileCount = 0;
            this.createNewLogFile();
        } catch(err:any) {
            channel.send("Error happened during sending log file :" + err);
        }
    }

    private createNewLogFile() {
        this.currentLogFile = `logs/log_${this.fileCount}.txt`;
        if(!fs.existsSync('logs')) {
            fs.mkdirSync('logs');
        }

        if(!fs.existsSync(this.currentLogFile)) {
            fs.writeFile(this.currentLogFile, "-------------------Starting log file-------------------", function (err:any) {
                if (err) throw err;
            });
        }
        this.fileCount++;
        this.lineCount = 1;
    }

    private getExtraStr(extra: any): string {
        switch (typeof extra) {
            case 'string': return extra;
            case 'object': return this.stringify(extra);
        }
        
        return "";
    }

    private stringify(obj:any): string {
    let cache:any = [];
    let str = JSON.stringify(obj, function(key, value) {
        if (typeof value === "object" && value !== null) {
        if (cache.indexOf(value) !== -1) {
            return;
        }
        cache.push(value);
        }
        return value;
    });
    cache = null;
    return str;
    }
}