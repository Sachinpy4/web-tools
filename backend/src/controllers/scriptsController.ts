import { Request, Response } from 'express';
import Script from '../models/Script';
import logger from '../utils/logger';

// Get all scripts for admin
export async function getAllScripts(req: Request, res: Response) {
  try {
    const scripts = await Script.find()
      .sort({ priority: 1, createdAt: -1 })
      .populate('createdBy', 'name email');
    
    res.json({
      status: 'success',
      data: scripts
    });
  } catch (error: any) {
    logger.error('Error fetching scripts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch scripts'
    });
  }
}

// Get scripts for a specific page (public API)
export async function getScriptsForPage(req: Request, res: Response) {
  try {
    const { pathname, placement } = req.query;
    
    if (!pathname || typeof pathname !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'pathname is required'
      });
    }

    // Security check - never return scripts for admin pages
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
      return res.json({
        status: 'success',
        data: []
      });
    }

    const query: any = { isActive: true };
    if (placement && typeof placement === 'string') {
      query.placement = placement;
    }

    const scripts = await Script.find(query)
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

    res.json({
      status: 'success',
      data: filteredScripts
    });
  } catch (error: any) {
    logger.error('Error fetching scripts for page:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch scripts'
    });
  }
}

// Create new script
export async function createScript(req: Request, res: Response) {
  try {
    const {
      name,
      description,
      content,
      placement,
      platform,
      priority,
      targetPages,
      excludePages,
      isActive
    } = req.body;

    // Validation
    if (!name || !content || !placement) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, content, and placement are required'
      });
    }

    const script = new Script({
      name,
      description,
      content,
      placement,
      platform: platform || 'Custom',
      priority: priority || 100,
      targetPages: targetPages || [],
      excludePages: excludePages || ['/admin', '/dashboard', '/api'],
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?.id
    });

    await script.save();

    res.status(201).json({
      status: 'success',
      data: script
    });
  } catch (error: any) {
    logger.error('Error creating script:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create script'
    });
  }
}

// Update script
export async function updateScript(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const script = await Script.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!script) {
      return res.status(404).json({
        status: 'error',
        message: 'Script not found'
      });
    }

    res.json({
      status: 'success',
      data: script
    });
  } catch (error: any) {
    logger.error('Error updating script:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update script'
    });
  }
}

// Delete script
export async function deleteScript(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const script = await Script.findByIdAndDelete(id);

    if (!script) {
      return res.status(404).json({
        status: 'error',
        message: 'Script not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Script deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting script:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete script'
    });
  }
}

// Toggle script active status
export async function toggleScriptStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const script = await Script.findById(id);
    if (!script) {
      return res.status(404).json({
        status: 'error',
        message: 'Script not found'
      });
    }

    script.isActive = !script.isActive;
    await script.save();

    res.json({
      status: 'success',
      data: script
    });
  } catch (error: any) {
    logger.error('Error toggling script status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle script status'
    });
  }
} 