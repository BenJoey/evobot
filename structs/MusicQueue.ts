import {
  AudioPlayer,
  AudioPlayerState,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  entersState,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionDisconnectReason,
  VoiceConnectionState,
  VoiceConnectionStatus
} from "@discordjs/voice";
import { Message, TextChannel, User } from "discord.js";
import { promisify } from "node:util";
import { bot } from "../index";
import { QueueOptions } from "../interfaces/QueueOptions";
import { config } from "../utils/config";
import { i18n } from "../utils/i18n";
import { getErrorMessage } from "../utils/errorMessage";
import { canModifyQueue } from "../utils/queue";
import { Song } from "./Song";
import { Logger } from "./Logger";

const wait = promisify(setTimeout);

const networkStateChangeHandler = (oldNetworkState: any, newNetworkState: any) => {
  const newUdp = Reflect.get(newNetworkState, 'udp');
  clearInterval(newUdp?.keepAliveInterval);
}

export class MusicQueue {
  public readonly message: Message;
  public readonly connection: VoiceConnection;
  public readonly player: AudioPlayer;
  public readonly textChannel: TextChannel;
  public readonly bot = bot;

  public resource: AudioResource;
  public songs: Song[] = [];
  public volume = config.DEFAULT_VOLUME || 100;
  public loop = false;
  public muted = false;
  public waitTimeout: NodeJS.Timeout | null;
  private queueLock = false;
  private readyLock = false;
  private stopped = false;

  public constructor(options: QueueOptions) {
    Object.assign(this, options);

    this.textChannel = options.message.channel as TextChannel;
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    this.connection.subscribe(this.player);

    this.connection.on("stateChange" as any, async (oldState: VoiceConnectionState, newState: VoiceConnectionState) => {
      Logger.getInstance().logMessage("Old state: " + oldState, "MusicQueue.VoiceConnectionstateChange");
      Logger.getInstance().logMessage("New state: " + newState, "MusicQueue.VoiceConnectionstateChange");
      const oldNetworking = Reflect.get(oldState, 'networking');
      const newNetworking = Reflect.get(newState, 'networking');
      oldNetworking?.off('stateChange', networkStateChangeHandler);
      newNetworking?.on('stateChange', networkStateChangeHandler);

      if (newState.status === VoiceConnectionStatus.Disconnected) {
        if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
          try {
            this.stop();
          } catch (e) {
            console.log(e);
            this.stop();
          }
        } else if (this.connection.rejoinAttempts < 5) {
          await wait((this.connection.rejoinAttempts + 1) * 5_000);
          this.connection.rejoin();
        } else {
          this.connection.destroy();
        }
      } else if (
        !this.readyLock &&
        (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
      ) {
        this.readyLock = true;
        try {
          await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
        } catch {
          if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
            try {
              this.connection.destroy();
            } catch {}
          }
        } finally {
          this.readyLock = false;
        }
      }
    });

    this.player.on("stateChange" as any, async (oldState: AudioPlayerState, newState: AudioPlayerState) => {
      Logger.getInstance().logMessage("Old state: " + oldState, "MusicQueue.AudioPlayerstateChange");
      Logger.getInstance().logMessage("New state: " + newState, "MusicQueue.AudioPlayerstateChange");
      if (oldState.status !== AudioPlayerStatus.Idle && newState.status === AudioPlayerStatus.Idle) {
        if (this.loop && this.songs.length) {
          this.songs.push(this.songs.shift()!);
        } else {
          this.songs.shift();
          if (!this.songs.length) return this.stop();
        }

        if (this.songs.length || this.resource.audioPlayer) this.processQueue();
      } else if (oldState.status === AudioPlayerStatus.Buffering && newState.status === AudioPlayerStatus.Playing) {
        this.sendPlayingMessage(newState);
      }
    });

    this.player.on("error", (error) => {
      Logger.getInstance().logMessage(error.message, "MusicQueue.error");
      console.error(error);

      if (this.loop && this.songs.length) {
        this.songs.push(this.songs.shift()!);
      } else {
        this.songs.shift();
      }

      this.processQueue();
    });
  }

  public enqueue(...songs: Song[]) {
    Logger.getInstance().logMessage("Adding song(s) to the queue", "MusicQueue.enqueue");
    if (this.waitTimeout !== null) clearTimeout(this.waitTimeout);
    this.waitTimeout = null;
    this.stopped = false;
    this.songs = this.songs.concat(songs);
    this.processQueue();
  }

  public enqueuePrio(...songs: Song[]) {
    Logger.getInstance().logMessage("Adding song(s) to the queue with priority", "MusicQueue.enqueuePrio");
    if (this.waitTimeout !== null) clearTimeout(this.waitTimeout);
    this.waitTimeout = null;
    this.stopped = false;
    let currentSong = this.songs.shift();
    if(currentSong == undefined) return;
    songs.unshift(currentSong);
    this.songs = songs.concat(this.songs);
    this.processQueue();
  }

  public stop() {
    if (this.stopped) return;

    Logger.getInstance().logMessage("Stopping the queue", "MusicQueue.stop");
    this.stopped = true;
    this.loop = false;
    this.songs = [];
    this.player.stop();

    !config.PRUNING && this.textChannel.send(i18n.__("play.queueEnded")).catch(console.error);

    if (this.waitTimeout !== null) clearTimeout(this.waitTimeout);

    this.waitTimeout = setTimeout(() => {
      if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        try {
          this.connection.destroy();
        } catch {}
      }
      bot.queues.delete(this.message.guild!.id);

      !config.PRUNING && this.textChannel.send(i18n.__("play.leaveChannel"));
    }, config.STAY_TIME * 1000);
  }

  public async processQueue(): Promise<void> {
    Logger.getInstance().logMessage("Processing the queue", "MusicQueue.processQueue");
    if (this.queueLock || this.player.state.status !== AudioPlayerStatus.Idle) {
      return;
    }

    if (!this.songs.length) {
      return this.stop();
    }

    this.queueLock = true;

    const next = this.songs[0];

    try {
      const resource = await next.makeResource();

      this.resource = resource!;
      this.player.play(this.resource);
      this.resource.volume?.setVolumeLogarithmic(this.volume / 100);
    } catch (error) {
      let skippedSong = this.songs.shift();
      this.sendErrorMessage(skippedSong?.title, error);
      this.queueLock = false;
      return this.processQueue();
    } finally {
      this.queueLock = false;
    }
  }

  private async sendErrorMessage(song: string | undefined, error: any) {
    let errMsg = getErrorMessage(error, song);
    Logger.getInstance().logMessage(errMsg, "MusicQueue.sendErrorMessage");
    await this.textChannel.send(errMsg);
  }

  private async sendPlayingMessage(newState: any) {
    const song = (newState.resource as AudioResource<Song>).metadata;

    let playingMessage: Message;

    try {
      playingMessage = await this.textChannel.send((newState.resource as AudioResource<Song>).metadata.startMessage());

      await playingMessage.react("⏭");
      await playingMessage.react("⏯");
      await playingMessage.react("🔇");
      await playingMessage.react("🔉");
      await playingMessage.react("🔊");
      await playingMessage.react("🔁");
      await playingMessage.react("🔀");
      await playingMessage.react("⏹");
    } catch (error: any) {
      console.error(error);
      this.textChannel.send(error.message);
      return;
    }

    const filter = (reaction: any, user: User) => user.id !== this.textChannel.client.user!.id;

    const collector = playingMessage.createReactionCollector({
      filter,
      time: song.duration > 0 ? song.duration * 1000 : 600000
    });

    collector.on("collect", async (reaction, user) => {
      if (!this.songs) return;

      const member = await playingMessage.guild!.members.fetch(user);

      reaction.users.remove(user).catch(console.error);
      if (!canModifyQueue(member)) return i18n.__("common.errorNotChannel");

      let command:string = "";
      switch (reaction.emoji.name) {
        case "⏭": command = "skip"; break;

        case "⏯":
          if (this.player.state.status == AudioPlayerStatus.Playing) {
            command = "pause";
          } else {
            command = "resume";
          }
          break;

        case "🔇":
          this.muted = !this.muted;
          if (this.muted) {
            this.resource.volume?.setVolumeLogarithmic(0);
            this.textChannel.send(i18n.__mf("play.mutedSong", { author: user.username })).catch(console.error);
          } else {
            this.resource.volume?.setVolumeLogarithmic(this.volume / 100);
            this.textChannel.send(i18n.__mf("play.unmutedSong", { author: user.username })).catch(console.error);
          }
          break;

        case "🔉":
          if (this.volume == 0) return;
          this.volume = Math.max(this.volume - 10, 0);
          this.resource.volume?.setVolumeLogarithmic(this.volume / 100);
          this.textChannel
            .send(i18n.__mf("play.decreasedVolume", { author: user.username, volume: this.volume }))
            .catch(console.error);
          break;

        case "🔊":
          if (this.volume == 100) return;
          this.volume = Math.min(this.volume + 10, 100);
          this.resource.volume?.setVolumeLogarithmic(this.volume / 100);
          this.textChannel
            .send(i18n.__mf("play.increasedVolume", { author: user.username, volume: this.volume }))
            .catch(console.error);
          break;

        case "🔁": command = "loop"; break;
        case "🔀": command = "shuffle"; break;
        case "⏹": command = "stop"; break;
        default:
          break;
      }

      try {
        if(command) {
          await this.bot.commands.get(command)!.execute(this.message, user);
          if(command == "stop") collector.stop();
        }
      } catch (e) {
        console.log("Error during emote response" + e);
      }
    });

    collector.on("end", () => {
      playingMessage.reactions.removeAll().catch(console.error);

      if (config.PRUNING) {
        setTimeout(() => {
          playingMessage.delete().catch();
        }, 3000);
      }
    });
  }
}
