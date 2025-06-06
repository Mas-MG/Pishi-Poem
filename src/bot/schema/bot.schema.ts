// bot/poem.schema.ts
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PoemDocument = Poem & Document;
@Schema({ timestamps: true })
export class Poem extends Document {
  @Prop({ required: true })
  userId: number; // The same as chatId

  @Prop()
  username?: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true })
  text: string;

  @Prop()
  category: string;

  @Prop()
  poet: string;

  @Prop()
  approved: boolean;

  @Prop({ type: [String], default: [] })
  channels: string[];
}

export const PoemSchema = SchemaFactory.createForClass(Poem);
