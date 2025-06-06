import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Poem } from './schema/bot.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Channel, ChannelDocument } from '../channel/schema/channel.schema';

@Injectable()
export class PoemSchedulerService {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(Poem.name) private readonly poemModel: Model<Poem>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  private async sendRandomPoemsToChannels() {
    const now = new Date();
    const hour = now.getHours();

    const allChannels = await this.channelModel.find().lean();

    for (const channel of allChannels) {
      const [start, end] = channel.timeRange.split('_').map(Number);

      const endHour = end === 24 ? 0 : end;

      const isInTimeRange =
        start < endHour
          ? hour >= start && hour < endHour
          : hour >= start || hour < endHour;

      const shouldSendThisHour = isInTimeRange && (hour - start + 24) % 3 === 0;

      // const shouldSendThisHour = isInTimeRange ;
      // console.log(shouldSendThisHour,start,endHour,hour)

      if (!shouldSendThisHour) continue;

      const query: any = {
        approved: true,
        channels: { $ne: channel.channelId },
      };

      if (!channel.allCategories && channel.categories?.length) {
        query.category = { $in: channel.categories };
      }

      const count = await this.poemModel.countDocuments(query);
      if (!count) continue;

      const randomIndex = Math.floor(Math.random() * count);
      const poem = await this.poemModel.findOne(query).skip(randomIndex).lean();
      if (!poem) continue;

      await this.poemModel.findByIdAndUpdate(poem._id, {
        $addToSet: { channels: channel.channelId },
      });

      const message = `${poem.text}\n\n- ${poem.poet || 'نامشخص'}`;

      try {
        await this.bot.telegram.sendMessage(channel.channelId, message);
      } catch (err) {
        console.error(
          `❌ Failed to send to channel ${channel.channelId}:`,
          err.message,
        );
      }
    }
  }

  @Cron('0 * * * *') // every hour at minute 0
  async sendEveryHour() {
    await this.sendRandomPoemsToChannels();
  }

  // @Cron('*/10 * * * * *') // every 10 seconds
  // async sendEvery10Seconds() {
  //   await this.sendRandomPoemsToChannels();
  // }
}
