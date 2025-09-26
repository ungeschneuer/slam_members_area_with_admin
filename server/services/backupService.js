// Backup Service for SLAM25 Application
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { executeQuery } from '../config/database.js';
import { logSecurityEvent } from '../middleware/securityLogger.js';
import logger from '../config/logger.js';

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/var/backups/slam25';
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 30;
    this.compressionEnabled = process.env.BACKUP_COMPRESSION === 'true';
    this.encryptionEnabled = process.env.BACKUP_ENCRYPTION === 'true';
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    
    this.ensureBackupDirectory();
  }

  // Ensure backup directory exists
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info(`Backup directory ensured: ${this.backupDir}`);
    } catch (error) {
      logger.error('Failed to create backup directory:', error);
    }
  }

  // Create backup
  async createBackup(type = 'full', description = '') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `slam25_${type}_backup_${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);
      
      // Build pg_dump command
      let command = `pg_dump -h ${process.env.DB_HOST || 'localhost'} -U ${process.env.DB_USER || 'slam_user'} -d ${process.env.DB_NAME || 'slam25_db'} -f ${filepath}`;
      
      // Add type-specific options
      switch (type) {
        case 'data-only':
          command += ' --data-only';
          break;
        case 'schema-only':
          command += ' --schema-only';
          break;
        default:
          command += ' --verbose --no-password';
      }
      
      // Add compression if enabled
      if (this.compressionEnabled) {
        command += ' --compress=9';
      }
      
      // Execute backup
      logger.info(`Creating ${type} backup...`);
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('WARNING')) {
        throw new Error(`Backup failed: ${stderr}`);
      }
      
      // Get file size
      const stats = await fs.stat(filepath);
      const fileSize = stats.size;
      
      // Encrypt backup if enabled
      if (this.encryptionEnabled && this.encryptionKey) {
        await this.encryptBackup(filepath);
      }
      
      // Store backup record in database
      const backupRecord = await this.storeBackupRecord({
        type,
        filename,
        filepath,
        size: fileSize,
        description,
        status: 'completed'
      });
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      logSecurityEvent('BACKUP_CREATED', {
        type,
        filename,
        size: fileSize,
        description,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Backup created successfully: ${filename} (${this.formatFileSize(fileSize)})`);
      
      return {
        id: backupRecord.id,
        type,
        filename,
        size: fileSize,
        description,
        status: 'completed',
        createdAt: backupRecord.created_at
      };
      
    } catch (error) {
      logger.error('Backup creation failed:', error);
      
      // Log failed backup
      await this.storeBackupRecord({
        type,
        filename: `failed_${type}_backup_${Date.now()}.sql`,
        filepath: null,
        size: 0,
        description,
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  // Restore backup
  async restoreBackup(backupId) {
    try {
      // Get backup details
      const backup = await this.getBackupDetails(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }
      
      if (backup.status !== 'completed') {
        throw new Error('Backup is not in completed status');
      }
      
      // Check if backup file exists
      if (!await this.backupFileExists(backup.filepath)) {
        throw new Error('Backup file not found');
      }
      
      // Decrypt backup if encrypted
      let restoreFile = backup.filepath;
      if (this.encryptionEnabled && this.encryptionKey) {
        restoreFile = await this.decryptBackup(backup.filepath);
      }
      
      // Build psql restore command
      const command = `psql -h ${process.env.DB_HOST || 'localhost'} -U ${process.env.DB_USER || 'slam_user'} -d ${process.env.DB_NAME || 'slam25_db'} -f ${restoreFile}`;
      
      logger.info(`Restoring backup: ${backup.filename}`);
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('WARNING')) {
        throw new Error(`Restore failed: ${stderr}`);
      }
      
      // Update backup record
      await this.updateBackupRecord(backupId, {
        lastRestored: new Date().toISOString(),
        restoreCount: (backup.restore_count || 0) + 1
      });
      
      logSecurityEvent('BACKUP_RESTORED', {
        backupId,
        filename: backup.filename,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Backup restored successfully: ${backup.filename}`);
      
      return {
        success: true,
        backupId,
        filename: backup.filename,
        restoredAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Backup restore failed:', error);
      throw error;
    }
  }

  // List all backups
  async listBackups() {
    try {
      const result = await executeQuery(`
        SELECT id, type, filename, size, description, status, created_at, last_restored, restore_count
        FROM backup_history 
        ORDER BY created_at DESC
      `);
      
      return result.rows.map(backup => ({
        ...backup,
        sizeFormatted: this.formatFileSize(backup.size),
        age: this.calculateAge(backup.created_at)
      }));
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  // Delete backup
  async deleteBackup(backupId) {
    try {
      const backup = await this.getBackupDetails(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }
      
      // Delete backup file
      if (backup.filepath && await this.backupFileExists(backup.filepath)) {
        await fs.unlink(backup.filepath);
      }
      
      // Delete backup record
      await executeQuery('DELETE FROM backup_history WHERE id = $1', [backupId]);
      
      logSecurityEvent('BACKUP_DELETED', {
        backupId,
        filename: backup.filename,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Backup deleted: ${backup.filename}`);
      
      return {
        success: true,
        backupId,
        filename: backup.filename
      };
      
    } catch (error) {
      logger.error('Failed to delete backup:', error);
      throw error;
    }
  }

  // Get backup details
  async getBackupDetails(backupId) {
    try {
      const result = await executeQuery(
        'SELECT * FROM backup_history WHERE id = $1',
        [backupId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get backup details:', error);
      return null;
    }
  }

  // Store backup record in database
  async storeBackupRecord(backupData) {
    try {
      const result = await executeQuery(`
        INSERT INTO backup_history 
        (type, filename, filepath, size, description, status, error_message, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
        RETURNING id, created_at
      `, [
        backupData.type,
        backupData.filename,
        backupData.filepath,
        backupData.size,
        backupData.description,
        backupData.status,
        backupData.error || null
      ]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to store backup record:', error);
      throw error;
    }
  }

  // Update backup record
  async updateBackupRecord(backupId, updates) {
    try {
      const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = Object.values(updates);
      
      await executeQuery(
        `UPDATE backup_history SET ${setClause} WHERE id = $1`,
        [backupId, ...values]
      );
    } catch (error) {
      logger.error('Failed to update backup record:', error);
      throw error;
    }
  }

  // Check if backup file exists
  async backupFileExists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  // Encrypt backup file
  async encryptBackup(filepath) {
    try {
      const encryptedPath = filepath + '.enc';
      const command = `openssl enc -aes-256-cbc -salt -in ${filepath} -out ${encryptedPath} -k ${this.encryptionKey}`;
      
      await execAsync(command);
      
      // Replace original with encrypted version
      await fs.rename(encryptedPath, filepath);
      
      logger.info(`Backup encrypted: ${path.basename(filepath)}`);
    } catch (error) {
      logger.error('Failed to encrypt backup:', error);
      throw error;
    }
  }

  // Decrypt backup file
  async decryptBackup(filepath) {
    try {
      const decryptedPath = filepath + '.dec';
      const command = `openssl enc -aes-256-cbc -d -in ${filepath} -out ${decryptedPath} -k ${this.encryptionKey}`;
      
      await execAsync(command);
      
      logger.info(`Backup decrypted: ${path.basename(filepath)}`);
      return decryptedPath;
    } catch (error) {
      logger.error('Failed to decrypt backup:', error);
      throw error;
    }
  }

  // Clean up old backups
  async cleanupOldBackups() {
    try {
      const result = await executeQuery(`
        SELECT id, filepath FROM backup_history 
        WHERE created_at < NOW() - INTERVAL '${this.maxBackups} days'
        ORDER BY created_at ASC
      `);
      
      for (const backup of result.rows) {
        // Delete backup file
        if (backup.filepath && await this.backupFileExists(backup.filepath)) {
          await fs.unlink(backup.filepath);
        }
        
        // Delete backup record
        await executeQuery('DELETE FROM backup_history WHERE id = $1', [backup.id]);
      }
      
      if (result.rows.length > 0) {
        logger.info(`Cleaned up ${result.rows.length} old backups`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
    }
  }

  // Format file size
  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Calculate age
  calculateAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  // Get backup statistics
  async getBackupStats() {
    try {
      const result = await executeQuery(`
        SELECT 
          COUNT(*) as total_backups,
          SUM(size) as total_size,
          AVG(size) as avg_size,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_backups,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups,
          MAX(created_at) as last_backup
        FROM backup_history
      `);
      
      const stats = result.rows[0];
      return {
        totalBackups: parseInt(stats.total_backups),
        totalSize: parseInt(stats.total_size || 0),
        avgSize: parseInt(stats.avg_size || 0),
        successfulBackups: parseInt(stats.successful_backups),
        failedBackups: parseInt(stats.failed_backups),
        lastBackup: stats.last_backup,
        successRate: stats.total_backups > 0 ? (stats.successful_backups / stats.total_backups * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Failed to get backup stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const backupService = new BackupService();

export default backupService;
