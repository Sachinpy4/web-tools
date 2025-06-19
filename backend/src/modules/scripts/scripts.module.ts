import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScriptController } from './controllers/script.controller';
import { ScriptService } from './services/script.service';
import { Script, ScriptSchema } from './schemas/script.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Script.name, schema: ScriptSchema },
    ]),
  ],
  controllers: [ScriptController],
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptsModule {} 