import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackupController } from './controllers/backup.controller';
import { BackupService } from './services/backup.service';
import { BackupHistory, BackupHistorySchema } from './schemas/backup-history.schema';
import { RestoreHistory, RestoreHistorySchema } from './schemas/restore-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BackupHistory.name, schema: BackupHistorySchema },
      { name: RestoreHistory.name, schema: RestoreHistorySchema },
    ]),
  ],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {} 