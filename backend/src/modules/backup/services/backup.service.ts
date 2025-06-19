import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { BackupHistory, BackupHistoryDocument } from '../schemas/backup-history.schema';
import { RestoreHistory, RestoreHistoryDocument } from '../schemas/restore-history.schema';
import { CreateBackupDto, RestoreBackupDto, BackupFilterDto } from '../dto/backup.dto';
import * as fs from 'fs';
import * as path from 'path';

import * as zlib from 'zlib';
import { promisify } from 'util';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;

  constructor(
    @InjectModel(BackupHistory.name) private backupHistoryModel: Model<BackupHistoryDocument>,
    @InjectModel(RestoreHistory.name) private restoreHistoryModel: Model<RestoreHistoryDocument>,
    @InjectConnection() private connection: Connection,
    private configService: ConfigService,
  ) {
    this.backupDir = this.configService.get<string>('BACKUP_DIR', './backups');
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDirectory() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
        this.logger.log(`Created backup directory: ${this.backupDir}`);
      }
    } catch (error) {
      this.logger.error('Error creating backup directory:', error);
      throw new Error('Failed to create backup directory');
    }
  }

  /**
   * Create database backup
   */
  async createBackup(createBackupDto: CreateBackupDto, userId?: string) {
    const startTime = Date.now();
    let backupRecord: BackupHistoryDocument;

    try {
      const { description, type = 'full', collections, compress = true } = createBackupDto;

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `backup_${timestamp}${compress ? '.gz' : '.json'}`;
      const filepath = path.join(this.backupDir, filename);

      // Create backup record
      backupRecord = await this.backupHistoryModel.create({
        filename,
        filepath,
        size: 0,
        type,
        status: 'in-progress',
        description,
        createdBy: userId,
        startedAt: new Date(),
      });

      this.logger.log(`Starting backup: ${filename}`);

      // Get database URI
      const dbUri = this.configService.get<string>('database.uri');
      if (!dbUri) {
        throw new Error('Database URI not configured');
      }

      // Parse database name from URI
      const dbName = this.extractDatabaseName(dbUri);

      // Perform backup using mongodump
      const backupData = await this.performMongoDump(dbName, collections);

      // Compress if requested
      let finalData = backupData;
      if (compress) {
        finalData = await this.compressData(backupData);
      }

      // Write backup file
      await fs.promises.writeFile(filepath, finalData);

      // Get file stats
      const stats = await fs.promises.stat(filepath);
      const duration = Date.now() - startTime;

      // Get metadata
      const metadata = await this.getBackupMetadata(dbName, collections, compress);

      // Update backup record
      backupRecord.status = 'completed';
      backupRecord.size = stats.size;
      backupRecord.completedAt = new Date();
      backupRecord.duration = duration;
      backupRecord.metadata = metadata;
      await backupRecord.save();

      this.logger.log(`Backup completed: ${filename} (${stats.size} bytes, ${duration}ms)`);

      return {
        status: 'success',
        data: backupRecord,
        message: 'Backup created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating backup:', error);

      // Update backup record with error
      if (backupRecord) {
        backupRecord.status = 'failed';
        backupRecord.errorMessage = error.message;
        backupRecord.duration = Date.now() - startTime;
        await backupRecord.save();
      }

      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(restoreBackupDto: RestoreBackupDto, userId?: string) {
    try {
      const { backupId, collections, overwrite = false, createSafetyBackup = true } = restoreBackupDto;

      // Find backup record
      const backup = await this.backupHistoryModel.findById(backupId);
      if (!backup) {
        throw new NotFoundException('Backup not found');
      }

      if (backup.status !== 'completed') {
        throw new BadRequestException('Cannot restore from incomplete backup');
      }

      if (!fs.existsSync(backup.filepath)) {
        throw new NotFoundException('Backup file not found');
      }

      this.logger.log(`Starting restore from backup: ${backup.filename}`);

      let safetyBackupId: string | null = null;

      // Create safety backup if requested and overwrite is enabled
      if (createSafetyBackup && overwrite) {
        this.logger.log('Creating safety backup before restore...');
        try {
          const safetyBackupDto = {
            type: 'full' as const,
            description: `Safety backup before restore from ${backup.filename}`,
            collections: collections || undefined,
            compress: true,
          };
          const safetyBackupResult = await this.createBackup(safetyBackupDto, userId);
          safetyBackupId = safetyBackupResult.data._id?.toString();
          this.logger.log(`Safety backup created: ${safetyBackupId}`);
        } catch (error) {
          this.logger.error('Failed to create safety backup:', error);
          throw new BadRequestException('Failed to create safety backup before restore');
        }
      }

      // Read backup file
      let backupData = await fs.promises.readFile(backup.filepath);

      // Decompress if needed
      if (backup.filename.endsWith('.gz')) {
        backupData = await this.decompressData(backupData);
      }

      // Parse backup data
      const data = JSON.parse(backupData.toString());

      // Get database name
      const dbUri = this.configService.get<string>('database.uri');
      const dbName = this.extractDatabaseName(dbUri);

      // Determine collections to restore
      const collectionsToRestore = collections && collections.length > 0 
        ? collections 
        : Object.keys(data.collections || {});

      // Create restore history record
      const restoreHistory = new this.restoreHistoryModel({
        sourceBackupId: backup._id,
        sourceType: 'existing_backup',
        restoreType: collections && collections.length > 0 ? 'selective' : 'full',
        collectionsRestored: [],
        collectionsSkipped: [],
        overwriteMode: overwrite,
        safetyBackupId: safetyBackupId ? new Types.ObjectId(safetyBackupId) : undefined,
        totalDocumentsRestored: 0,
        status: 'in_progress',
        startedAt: new Date(),
        restoredBy: userId ? new Types.ObjectId(userId) : undefined,
        description: `Restore from backup: ${backup.filename}`,
      });

      await restoreHistory.save();

      try {
        // Perform restore
        const restoreResult = await this.performMongoRestore(dbName, data, collectionsToRestore, overwrite);

        // Update restore history
        restoreHistory.status = 'completed';
        restoreHistory.completedAt = new Date();
        restoreHistory.collectionsRestored = restoreResult.collectionsRestored;
        restoreHistory.totalDocumentsRestored = restoreResult.totalDocuments;
        await restoreHistory.save();

        // Update backup record
        backup.isRestored = true;
        backup.restoredAt = new Date();
        backup.restoredBy = userId ? new Types.ObjectId(userId) : undefined;
        await backup.save();

        this.logger.log(`Restore completed from backup: ${backup.filename}`);

        return {
          status: 'success',
          data: {
            backup,
            restoreHistory,
            safetyBackupId,
            totalDocumentsRestored: restoreResult.totalDocuments,
          },
          message: 'Database restored successfully',
        };
      } catch (restoreError) {
        // Update restore history with error
        restoreHistory.status = 'failed';
        restoreHistory.completedAt = new Date();
        restoreHistory.errorMessage = restoreError.message;
        await restoreHistory.save();
        throw restoreError;
      }
    } catch (error) {
      this.logger.error('Error restoring backup:', error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  /**
   * Get all backups with filtering and pagination
   */
  async getAllBackups(filterDto: BackupFilterDto) {
    try {
      const { type, status, dateFrom, dateTo, page = 1, limit = 20 } = filterDto;

      // Build query
      const query: any = { isDeleted: false };

      if (type) query.type = type;
      if (status) query.status = status;

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      // Get total count
      const total = await this.backupHistoryModel.countDocuments(query);

      // Get paginated results
      const backups = await this.backupHistoryModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email')
        .populate('restoredBy', 'name email')
        .populate('deletedBy', 'name email');

      const pages = Math.ceil(total / limit);

      return {
        status: 'success',
        data: {
          backups,
          total
        },
        pagination: {
          total,
          page,
          limit,
          pages,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching backups:', error);
      throw new Error('Failed to fetch backups');
    }
  }

  /**
   * Get backup by ID
   */
  async getBackupById(id: string) {
    try {
      const backup = await this.backupHistoryModel
        .findById(id)
        .populate('createdBy', 'name email')
        .populate('restoredBy', 'name email')
        .populate('deletedBy', 'name email');

      if (!backup) {
        throw new NotFoundException('Backup not found');
      }

      return {
        status: 'success',
        data: backup,
      };
    } catch (error) {
      this.logger.error('Error fetching backup:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error('Failed to fetch backup');
    }
  }

  /**
   * Download backup file
   */
  async downloadBackup(id: string, res: any) {
    try {
      this.logger.log(`Download backup requested: ${id}`);

      // Find backup record
      const backup = await this.backupHistoryModel.findById(id);
      if (!backup) {
        throw new NotFoundException('Backup not found');
      }

      this.logger.log(`Backup found, checking file: ${backup.filepath}`);

      // Check if file exists
      if (!fs.existsSync(backup.filepath)) {
        this.logger.error(`Backup file not found: ${backup.filepath}`);
        throw new NotFoundException('Backup file not found');
      }

      this.logger.log(`Starting download: ${backup.filename}`);

      // Set download headers
      res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // Stream the file
      const fileStream = fs.createReadStream(backup.filepath);
      fileStream.pipe(res);

      this.logger.log(`Backup file download started: ${backup.filename}`);
    } catch (error) {
      this.logger.error('Error downloading backup:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to download backup');
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(id: string, userId?: string) {
    try {
      const backup = await this.backupHistoryModel.findById(id);

      if (!backup) {
        throw new NotFoundException('Backup not found');
      }

      // Mark as deleted (soft delete)
      backup.isDeleted = true;
      backup.deletedAt = new Date();
      backup.deletedBy = userId ? new Types.ObjectId(userId) : undefined;
      await backup.save();

      // Optionally delete physical file
      try {
        if (fs.existsSync(backup.filepath)) {
          await fs.promises.unlink(backup.filepath);
          this.logger.log(`Deleted backup file: ${backup.filepath}`);
        }
      } catch (fileError) {
        this.logger.warn(`Failed to delete backup file: ${fileError.message}`);
      }

      this.logger.log(`Deleted backup: ${backup.filename}`);

      return {
        status: 'success',
        message: 'Backup deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting backup:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error('Failed to delete backup');
    }
  }

  /**
   * Get restore history
   */
  async getRestoreHistory() {
    try {
      const restores = await this.restoreHistoryModel
        .find()
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('sourceBackupId', 'filename type')
        .populate('safetyBackupId', 'filename')
        .exec();

      return {
        status: 'success',
        data: {
          restores
        },
        message: 'Restore history retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching restore history:', error);
      throw new Error('Failed to retrieve restore history');
    }
  }

  /**
   * Get restore preview
   */
  async getRestorePreview(backupId: string, collections?: string) {
    try {
      this.logger.log(`Getting restore preview for backup: ${backupId}`);

      // Validate required parameters
      if (!backupId) {
        throw new BadRequestException('Backup ID is required');
      }

      // Find backup record
      const backup = await this.backupHistoryModel.findById(backupId);
      if (!backup) {
        this.logger.warn(`Backup not found: ${backupId}`);
        throw new NotFoundException('Backup not found');
      }

      this.logger.log(`Backup found: ${backup.filename}, status: ${backup.status}`);

      if (backup.isDeleted) {
        throw new BadRequestException('Cannot preview deleted backup');
      }

      if (backup.status !== 'completed') {
        throw new BadRequestException(`Cannot preview backup with status: ${backup.status}`);
      }

      // Check if backup file exists
      if (!fs.existsSync(backup.filepath)) {
        this.logger.error(`Backup file not found: ${backup.filepath}`);
        throw new NotFoundException(`Backup file not found: ${backup.filepath}`);
      }

      this.logger.log(`Reading backup file: ${backup.filepath}`);

      // Read and parse backup file
      let backupData = await fs.promises.readFile(backup.filepath);

      // Decompress if needed
      if (backup.filename.endsWith('.gz')) {
        this.logger.log('Decompressing backup file');
        backupData = await this.decompressData(backupData);
      }

      // Parse backup data
      const data = JSON.parse(backupData.toString());

      // Extract collections to restore
      const requestedCollections = collections ? collections.split(',').map(c => c.trim()) : undefined;
      const availableCollections = Object.keys(data.collections || {});
      const collectionsToRestore = requestedCollections 
        ? requestedCollections.filter(col => availableCollections.includes(col))
        : availableCollections;

      this.logger.log(`Collections analysis: requested=${requestedCollections}, available=${availableCollections}, toRestore=${collectionsToRestore}`);

      // Calculate total documents
      const totalDocuments = collectionsToRestore.reduce((sum, col) => {
        const collectionData = data.collections[col];
        return sum + (collectionData?.length || 0);
      }, 0);

      // Get backup file size
      const backupStats = await fs.promises.stat(backup.filepath);
      const estimatedSize = this.formatBytes(backupStats.size);

      const preview = {
        backupInfo: {
          type: backup.type,
          timestamp: backup.createdAt.toISOString(),
          version: data.metadata?.version || '1.0',
        },
        collectionsToRestore,
        totalDocuments,
        estimatedSize,
      };

      this.logger.log(`Restore preview generated successfully: ${totalDocuments} documents across ${collectionsToRestore.length} collections`);

      return {
        status: 'success',
        data: preview,
        message: 'Restore preview generated successfully',
      };
    } catch (error) {
      this.logger.error('Error generating restore preview:', error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new Error(`Failed to generate restore preview: ${error.message}`);
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats() {
    try {
      const total = await this.backupHistoryModel.countDocuments({ isDeleted: false });
      const completed = await this.backupHistoryModel.countDocuments({ status: 'completed', isDeleted: false });
      const failed = await this.backupHistoryModel.countDocuments({ status: 'failed', isDeleted: false });
      const inProgress = await this.backupHistoryModel.countDocuments({ status: 'in-progress', isDeleted: false });
      const pending = await this.backupHistoryModel.countDocuments({ status: 'pending', isDeleted: false });

      // Get size statistics
      const sizeStats = await this.backupHistoryModel.aggregate([
        { $match: { status: 'completed', isDeleted: false } },
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$size' },
            averageSize: { $avg: '$size' },
          },
        },
      ]);

      const totalSize = sizeStats[0]?.totalSize || 0;
      const averageSize = sizeStats[0]?.averageSize || 0;

      // Get type distribution
      const typeStats = await this.backupHistoryModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]);

      const typeDistribution = {
        manual: 0,
        scheduled: 0,
        auto: 0,
      };

      typeStats.forEach(stat => {
        typeDistribution[stat._id] = stat.count;
      });

      // Get date range
      const dateRange = await this.backupHistoryModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            oldest: { $min: '$createdAt' },
            newest: { $max: '$createdAt' },
          },
        },
      ]);

      const oldestBackup = dateRange[0]?.oldest?.toISOString() || null;
      const newestBackup = dateRange[0]?.newest?.toISOString() || null;

      // Get recent backups and last backup
      const recentBackups = await this.backupHistoryModel
        .find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .exec();

      const lastBackup = await this.backupHistoryModel
        .findOne({ status: 'completed', isDeleted: false })
        .sort({ createdAt: -1 })
        .exec();

      return {
        status: 'success',
        data: {
          // Frontend expects this structure
          recentBackups,
          storage: {
            totalSize: this.formatBytes(totalSize),
            totalFiles: completed,
            directory: this.backupDir
          },
          lastBackup,
          // Additional stats for potential future use
          stats: {
            total,
            completed,
            failed,
            inProgress,
            pending,
            averageSize: Math.round(averageSize),
            averageSizeFormatted: this.formatBytes(Math.round(averageSize)),
            oldestBackup,
            newestBackup,
            typeDistribution,
          }
        },
      };
    } catch (error) {
      this.logger.error('Error fetching backup statistics:', error);
      throw new Error('Failed to fetch backup statistics');
    }
  }

  /**
   * Helper methods
   */
  private extractDatabaseName(uri: string): string {
    try {
      const url = new URL(uri);
      return url.pathname.substring(1); // Remove leading slash
    } catch (error) {
      throw new Error('Invalid database URI');
    }
  }

  private async performMongoDump(dbName: string, collections?: string[]): Promise<Buffer> {
    try {
      const db = this.connection.db;
      const backupData: any = {
        metadata: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          database: dbName,
          type: 'javascript-backup',
        },
        data: {},
      };

      // Get all collections if none specified
      let targetCollections = collections;
      if (!targetCollections || targetCollections.length === 0) {
        const allCollections = await db.listCollections().toArray();
        targetCollections = allCollections.map(c => c.name);
      }

      this.logger.log(`Backing up collections: ${targetCollections.join(', ')}`);

      // Export each collection
      for (const collectionName of targetCollections) {
        try {
          const collection = db.collection(collectionName);
          const documents = await collection.find({}).toArray();
          
          backupData.data[collectionName] = {
            count: documents.length,
            documents: documents,
          };

          this.logger.log(`Exported ${documents.length} documents from ${collectionName}`);
        } catch (error) {
          this.logger.warn(`Failed to backup collection ${collectionName}: ${error.message}`);
          // Continue with other collections
          backupData.data[collectionName] = {
            count: 0,
            documents: [],
            error: error.message,
          };
        }
      }

      backupData.metadata.collections = targetCollections;
      backupData.metadata.completedAt = new Date().toISOString();

      // Convert to Buffer
      const jsonString = JSON.stringify(backupData, null, 2);
      return Buffer.from(jsonString, 'utf8');
    } catch (error) {
      this.logger.error('Error performing JavaScript backup:', error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  private async performMongoRestore(dbName: string, backupData: any, collections?: string[], dropExisting = false): Promise<{ totalDocuments: number; collectionsRestored: string[] }> {
    try {
      const db = this.connection.db;
      let totalDocuments = 0;
      const collectionsRestored: string[] = [];
      
      // Validate backup data structure
      if (!backupData.data) {
        throw new Error('Invalid backup format: missing data section');
      }

      // Get collections to restore
      const targetCollections = collections || Object.keys(backupData.data);
      
      this.logger.log(`Restoring collections: ${targetCollections.join(', ')}`);

      if (dropExisting) {
        // Drop specified collections
        for (const collectionName of targetCollections) {
          try {
            await db.collection(collectionName).drop();
            this.logger.log(`Dropped existing collection: ${collectionName}`);
          } catch (error) {
            // Ignore errors if collection doesn't exist
            this.logger.warn(`Could not drop collection ${collectionName}: ${error.message}`);
          }
        }
      }

      // Restore each collection
      for (const collectionName of targetCollections) {
        if (backupData.data[collectionName]) {
          const collectionData = backupData.data[collectionName];
          
          if (collectionData.documents && Array.isArray(collectionData.documents)) {
            if (collectionData.documents.length > 0) {
              try {
                await db.collection(collectionName).insertMany(collectionData.documents);
                totalDocuments += collectionData.documents.length;
                collectionsRestored.push(collectionName);
                this.logger.log(`Restored ${collectionData.documents.length} documents to ${collectionName}`);
              } catch (error) {
                this.logger.error(`Failed to restore collection ${collectionName}: ${error.message}`);
                throw error;
              }
            } else {
              this.logger.log(`Collection ${collectionName} is empty, skipping`);
              collectionsRestored.push(collectionName);
            }
          } else {
            this.logger.warn(`Invalid data format for collection ${collectionName}`);
          }
        } else {
          this.logger.warn(`Collection ${collectionName} not found in backup data`);
        }
      }

      return { totalDocuments, collectionsRestored };
    } catch (error) {
      this.logger.error('Error performing restore:', error);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  private async compressData(data: Buffer): Promise<Buffer> {
    const gzip = promisify(zlib.gzip);
    return await gzip(data);
  }

  private async decompressData(data: Buffer): Promise<Buffer> {
    const gunzip = promisify(zlib.gunzip);
    return await gunzip(data);
  }

  private async getBackupMetadata(dbName: string, collections?: string[], compressed = false) {
    try {
      const db = this.connection.db;
      const allCollections = await db.listCollections().toArray();
      
      const targetCollections = collections || allCollections.map(c => c.name);
      let totalDocuments = 0;
      let totalSize = 0;

      for (const collectionName of targetCollections) {
        try {
          const collection = db.collection(collectionName);
          const count = await collection.countDocuments();
          const stats = await db.command({ collStats: collectionName });
          
          totalDocuments += count;
          totalSize += stats.size || 0;
        } catch (error) {
          // Skip collections that don't exist or can't be accessed
          this.logger.warn(`Could not get stats for collection ${collectionName}: ${error.message}`);
        }
      }

      return {
        collections: targetCollections,
        totalDocuments,
        totalSize,
        compression: compressed ? 'gzip' : 'none',
      };
    } catch (error) {
      this.logger.error('Error getting backup metadata:', error);
      return {
        collections: collections || [],
        totalDocuments: 0,
        totalSize: 0,
        compression: compressed ? 'gzip' : 'none',
      };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 