import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Script, ScriptDocument } from '../schemas/script.schema';
import { CreateScriptDto, UpdateScriptDto } from '../dto/script.dto';

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    @InjectModel(Script.name) private scriptModel: Model<ScriptDocument>,
  ) {}

  /**
   * Get all scripts for admin
   */
  async getAllScripts() {
    try {
      const scripts = await this.scriptModel
        .find()
        .sort({ priority: 1, createdAt: -1 })
        .populate('createdBy', 'name email');

      return {
        status: 'success',
        data: scripts,
      };
    } catch (error) {
      this.logger.error('Error fetching scripts:', error);
      throw new Error('Failed to fetch scripts');
    }
  }

  /**
   * Get scripts for a specific page (public API)
   */
  async getScriptsForPage(pathname: string, placement?: string) {
    try {
      if (!pathname || typeof pathname !== 'string') {
        throw new BadRequestException('pathname is required');
      }

      // Security check - never return scripts for admin pages
      if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
        return {
          status: 'success',
          data: [],
        };
      }

      const query: any = { isActive: true };
      if (placement && typeof placement === 'string') {
        query.placement = placement;
      }

      const scripts = await this.scriptModel
        .find(query)
        .sort({ priority: 1, createdAt: 1 })
        .select('content placement priority platform');

      // Filter scripts based on page targeting
      const filteredScripts = scripts.filter((script: any) => {
        // Check if page is explicitly excluded
        if (script.excludePages?.some((excludePage: string) => pathname.startsWith(excludePage))) {
          return false;
        }

        // If targetPages is empty, load on all public pages
        if (!script.targetPages || script.targetPages.length === 0) {
          return true;
        }

        // Check if page is in target pages
        return script.targetPages.some((targetPage: string) =>
          pathname === targetPage || pathname.startsWith(targetPage + '/')
        );
      });

      return {
        status: 'success',
        data: filteredScripts,
      };
    } catch (error) {
      this.logger.error('Error fetching scripts for page:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to fetch scripts');
    }
  }

  /**
   * Create new script
   */
  async createScript(createScriptDto: CreateScriptDto, userId?: string) {
    try {
      const { name, description, content, placement, platform, priority, targetPages, excludePages, isActive } = createScriptDto;

      // Validation
      if (!name || !content || !placement) {
        throw new BadRequestException('Name, content, and placement are required');
      }

      const script = await this.scriptModel.create({
        name,
        description,
        content,
        placement,
        platform: platform || 'Custom',
        priority: priority || 100,
        targetPages: targetPages || [],
        excludePages: excludePages || ['/admin', '/dashboard', '/api'],
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId,
      });

      this.logger.log(`Created script: ${name} (Platform: ${platform})`);

      return {
        status: 'success',
        data: script,
      };
    } catch (error) {
      this.logger.error('Error creating script:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }

      throw new Error('Failed to create script');
    }
  }

  /**
   * Update script
   */
  async updateScript(id: string, updateScriptDto: UpdateScriptDto) {
    try {
      // Remove fields that shouldn't be updated
      const updateData = { ...updateScriptDto };
      delete (updateData as any)._id;
      delete (updateData as any).createdAt;
      delete (updateData as any).updatedAt;

      const script = await this.scriptModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!script) {
        throw new NotFoundException('Script not found');
      }

      this.logger.log(`Updated script: ${script.name}`);

      return {
        status: 'success',
        data: script,
      };
    } catch (error) {
      this.logger.error('Error updating script:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }

      throw new Error('Failed to update script');
    }
  }

  /**
   * Delete script
   */
  async deleteScript(id: string) {
    try {
      const script = await this.scriptModel.findByIdAndDelete(id);

      if (!script) {
        throw new NotFoundException('Script not found');
      }

      this.logger.log(`Deleted script: ${script.name}`);

      return {
        status: 'success',
        message: 'Script deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting script:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error('Failed to delete script');
    }
  }

  /**
   * Get script by ID
   */
  async getScriptById(id: string) {
    try {
      const script = await this.scriptModel
        .findById(id)
        .populate('createdBy', 'name email');

      if (!script) {
        throw new NotFoundException('Script not found');
      }

      return {
        status: 'success',
        data: script,
      };
    } catch (error) {
      this.logger.error('Error fetching script:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error('Failed to fetch script');
    }
  }

  /**
   * Toggle script status
   */
  async toggleScriptStatus(id: string) {
    try {
      const script = await this.scriptModel.findById(id);

      if (!script) {
        throw new NotFoundException('Script not found');
      }

      script.isActive = !script.isActive;
      await script.save();

      this.logger.log(`Toggled script status: ${script.name} to ${script.isActive}`);

      return {
        status: 'success',
        data: script,
        message: `Script ${script.isActive ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error) {
      this.logger.error('Error toggling script status:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new Error('Failed to toggle script status');
    }
  }

  /**
   * Get scripts by platform
   */
  async getScriptsByPlatform(platform: string) {
    try {
      const scripts = await this.scriptModel
        .find({ platform, isActive: true })
        .sort({ priority: 1, createdAt: -1 })
        .populate('createdBy', 'name email');

      return {
        status: 'success',
        data: scripts,
      };
    } catch (error) {
      this.logger.error('Error fetching scripts by platform:', error);
      throw new Error('Failed to fetch scripts by platform');
    }
  }

  /**
   * Get script statistics
   */
  async getScriptStats() {
    try {
      const totalScripts = await this.scriptModel.countDocuments();
      const activeScripts = await this.scriptModel.countDocuments({ isActive: true });
      const inactiveScripts = totalScripts - activeScripts;

      // Get platform distribution
      const platformStats = await this.scriptModel.aggregate([
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ['$isActive', true] }, 1, 0]
              }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Get placement distribution
      const placementStats = await this.scriptModel.aggregate([
        {
          $group: {
            _id: '$placement',
            count: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ['$isActive', true] }, 1, 0]
              }
            }
          }
        }
      ]);

      return {
        status: 'success',
        data: {
          total: totalScripts,
          active: activeScripts,
          inactive: inactiveScripts,
          platforms: platformStats,
          placements: placementStats,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching script statistics:', error);
      throw new Error('Failed to fetch script statistics');
    }
  }
} 