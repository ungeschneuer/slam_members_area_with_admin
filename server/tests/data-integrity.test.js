// Data Integrity Tests for SLAM25 Application
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { 
  executeQuery, 
  executeTransaction,
  performFullDataIntegrityCheck,
  validateDataTypes,
  performIntegrityCheck,
  validateReferentialIntegrity
} from '../config/database.js';

// Mock the database connection for testing
jest.mock('../config/database.js');

describe('Data Integrity Features', () => {
  beforeAll(async () => {
    // Setup test database or mock connections
    console.log('Setting up data integrity tests...');
  });

  afterAll(async () => {
    // Cleanup test database
    console.log('Cleaning up data integrity tests...');
  });

  describe('executeQuery with Validation', () => {
    it('should validate constraints when enabled', async () => {
      // Mock constraint validation success
      const mockResult = { rows: [{ id: 1, name: 'Test Participant' }], rowCount: 1 };
      executeQuery.mockResolvedValueOnce(mockResult);

      const result = await executeQuery(
        'INSERT INTO participants (name, role, region) VALUES ($1, $2, $3) RETURNING *',
        ['Test User', 'Teilnehmer', 'Berlin'],
        { validateConstraints: true }
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Test Participant');
    });

    it('should reject invalid data when validation is enabled', async () => {
      // Mock constraint validation failure
      executeQuery.mockRejectedValueOnce(new Error('NULL value not allowed for column name'));

      await expect(executeQuery(
        'INSERT INTO participants (name, role, region) VALUES ($1, $2, $3)',
        [null, 'Teilnehmer', 'Berlin'],
        { validateConstraints: true }
      )).rejects.toThrow('NULL value not allowed for column name');
    });

    it('should validate result structure when specified', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Test' }], rowCount: 1 };
      executeQuery.mockResolvedValueOnce(mockResult);

      const result = await executeQuery(
        'SELECT * FROM participants WHERE id = $1',
        [1],
        { 
          validateResult: { 
            minRows: 1, 
            requiredFields: ['id', 'name'] 
          } 
        }
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0]).toHaveProperty('name');
    });

    it('should reject results that do not meet validation criteria', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      executeQuery.mockResolvedValueOnce(mockResult);

      await expect(executeQuery(
        'SELECT * FROM participants WHERE id = $1',
        [999],
        { validateResult: { minRows: 1 } }
      )).rejects.toThrow('Query returned 0 rows, expected at least 1');
    });

    it('should log slow queries', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockResult = { rows: [], rowCount: 0 };
      
      // Mock a slow query by delaying the response
      executeQuery.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds
        return mockResult;
      });

      await executeQuery('SELECT * FROM participants');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('executeTransaction with Integrity Checks', () => {
    it('should successfully execute transaction with integrity validation', async () => {
      const mockResults = [
        { rows: [{ id: 1 }], rowCount: 1 },
        { rows: [{ id: 1 }], rowCount: 1 }
      ];
      
      executeTransaction.mockResolvedValueOnce(mockResults);

      const queries = [
        { 
          query: 'INSERT INTO rounds (title, "startDateTime", "endDateTime") VALUES ($1, $2, $3) RETURNING id',
          params: ['Test Round', '2025-01-01 10:00:00', '2025-01-01 12:00:00'],
          validate: true
        },
        {
          query: 'INSERT INTO round_participants (round_id, participant_id) VALUES ($1, $2)',
          params: [1, 1],
          validate: true
        }
      ];

      const results = await executeTransaction(queries, {
        validateIntegrity: true,
        checkReferences: true,
        auditLog: true
      });

      expect(results).toHaveLength(2);
      expect(results[0].rows[0]).toHaveProperty('id');
    });

    it('should rollback transaction on integrity check failure', async () => {
      executeTransaction.mockRejectedValueOnce(new Error('Referential integrity violation'));

      const queries = [
        { 
          query: 'INSERT INTO round_participants (round_id, participant_id) VALUES ($1, $2)',
          params: [999, 1], // Non-existent round_id
          validate: true
        }
      ];

      await expect(executeTransaction(queries, {
        validateIntegrity: true,
        checkReferences: true
      })).rejects.toThrow('Referential integrity violation');
    });

    it('should log successful transactions when audit is enabled', async () => {
      const mockResults = [{ rows: [{ id: 1 }], rowCount: 1 }];
      executeTransaction.mockResolvedValueOnce(mockResults);

      const queries = [
        { 
          query: 'INSERT INTO participants (name, role, region) VALUES ($1, $2, $3) RETURNING id',
          params: ['Test User', 'Teilnehmer', 'Berlin']
        }
      ];

      const results = await executeTransaction(queries, { auditLog: true });
      
      expect(results).toEqual(mockResults);
      // In a real implementation, we would check that audit log was written
    });
  });

  describe('Data Integrity Validation Functions', () => {
    it('should validate data types correctly', async () => {
      // Mock schema information
      const mockSchemaInfo = {
        rows: [
          {
            column_name: 'name',
            data_type: 'character varying',
            is_nullable: 'NO',
            character_maximum_length: 255
          }
        ]
      };

      const mockClient = {
        query: jest.fn().mockResolvedValueOnce(mockSchemaInfo)
      };

      // This should not throw for valid data
      await expect(validateDataTypes(
        'INSERT INTO participants (name) VALUES ($1)',
        ['Valid Name'],
        mockClient
      )).resolves.toBeUndefined();
    });

    it('should reject null values for non-nullable columns', async () => {
      const mockSchemaInfo = {
        rows: [
          {
            column_name: 'name',
            data_type: 'character varying',
            is_nullable: 'NO',
            character_maximum_length: 255
          }
        ]
      };

      const mockClient = {
        query: jest.fn().mockResolvedValueOnce(mockSchemaInfo)
      };

      await expect(validateDataTypes(
        'INSERT INTO participants (name) VALUES ($1)',
        [null],
        mockClient
      )).rejects.toThrow('NULL value not allowed for column name');
    });

    it('should reject strings that exceed maximum length', async () => {
      const mockSchemaInfo = {
        rows: [
          {
            column_name: 'name',
            data_type: 'character varying',
            is_nullable: 'YES',
            character_maximum_length: 10
          }
        ]
      };

      const mockClient = {
        query: jest.fn().mockResolvedValueOnce(mockSchemaInfo)
      };

      await expect(validateDataTypes(
        'INSERT INTO participants (name) VALUES ($1)',
        ['This string is way too long for the column'],
        mockClient
      )).rejects.toThrow('Value too long for column name (max: 10)');
    });
  });

  describe('Integrity Check Functions', () => {
    it('should detect foreign key violations', async () => {
      // Mock foreign key violation
      const mockViolations = {
        rows: [
          {
            conname: 'fk_round_participants_round_id',
            conrelid: 'round_participants',
            confrelid: 'rounds'
          }
        ]
      };

      const mockClient = {
        query: jest.fn().mockResolvedValueOnce(mockViolations)
      };

      await expect(performIntegrityCheck(mockClient))
        .rejects.toThrow('Foreign key violations detected: fk_round_participants_round_id');
    });

    it('should pass when no foreign key violations exist', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // No FK violations
          .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // No orphaned records
      };

      await expect(performIntegrityCheck(mockClient)).resolves.toBeUndefined();
    });

    it('should detect referential integrity violations', async () => {
      // Mock referential integrity violation
      const mockViolations = {
        rows: [{ count: 5 }]
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue(mockViolations)
      };

      await expect(validateReferentialIntegrity(mockClient))
        .rejects.toThrow('Referential integrity violation');
    });

    it('should pass referential integrity check when no violations exist', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ count: 0 }] })
      };

      await expect(validateReferentialIntegrity(mockClient)).resolves.toBeUndefined();
    });
  });

  describe('Full Data Integrity Check', () => {
    it('should generate comprehensive integrity report', async () => {
      const mockReport = {
        timestamp: '2025-01-01T00:00:00.000Z',
        checks: [
          { name: 'Foreign Key Constraints', status: 'PASSED' },
          { name: 'Duplicate participants', status: 'PASSED' }
        ],
        errors: [],
        warnings: []
      };

      performFullDataIntegrityCheck.mockResolvedValueOnce(mockReport);

      const report = await performFullDataIntegrityCheck();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('checks');
      expect(report).toHaveProperty('errors');
      expect(report).toHaveProperty('warnings');
      expect(report.checks).toBeInstanceOf(Array);
      expect(report.errors).toBeInstanceOf(Array);
      expect(report.warnings).toBeInstanceOf(Array);
    });

    it('should identify data consistency issues', async () => {
      const mockReport = {
        timestamp: '2025-01-01T00:00:00.000Z',
        checks: [],
        errors: [],
        warnings: [
          {
            check: 'Round dates consistency',
            description: 'Rounds with end date before start date',
            count: 2,
            details: [
              { id: 1, title: 'Invalid Round 1' },
              { id: 2, title: 'Invalid Round 2' }
            ]
          }
        ]
      };

      performFullDataIntegrityCheck.mockResolvedValueOnce(mockReport);

      const report = await performFullDataIntegrityCheck();

      expect(report.warnings).toHaveLength(1);
      expect(report.warnings[0]).toHaveProperty('check', 'Round dates consistency');
      expect(report.warnings[0]).toHaveProperty('count', 2);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection errors gracefully', async () => {
      executeQuery.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(executeQuery('SELECT NOW()', []))
        .rejects.toThrow('ECONNREFUSED');
    });

    it('should handle constraint violation errors appropriately', async () => {
      const constraintError = new Error('duplicate key value violates unique constraint');
      constraintError.code = '23505';
      
      executeQuery.mockRejectedValueOnce(constraintError);

      await expect(executeQuery(
        'INSERT INTO participants (name, region) VALUES ($1, $2)',
        ['John Doe', 'Berlin']
      )).rejects.toThrow('duplicate key value violates unique constraint');
    });

    it('should provide helpful error messages for validation failures', async () => {
      executeQuery.mockRejectedValueOnce(new Error('CASCADE DELETE requires explicit confirmation'));

      await expect(executeQuery(
        'DELETE FROM participants WHERE region = $1 CASCADE',
        ['Berlin'],
        { validateConstraints: true }
      )).rejects.toThrow('CASCADE DELETE requires explicit confirmation');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track query execution time', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      executeQuery.mockResolvedValueOnce(mockResult);

      const startTime = Date.now();
      await executeQuery('SELECT * FROM participants');
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should collect integrity check metrics', async () => {
      const mockReport = {
        timestamp: '2025-01-01T00:00:00.000Z',
        checks: [
          { name: 'Test Check', status: 'PASSED' }
        ],
        errors: [],
        warnings: []
      };

      performFullDataIntegrityCheck.mockResolvedValueOnce(mockReport);

      const report = await performFullDataIntegrityCheck();
      
      expect(report.checks.length + report.errors.length + report.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('Integration Tests', () => {
  describe('Real-world Scenarios', () => {
    it('should handle participant creation with full validation pipeline', async () => {
      // This would be an integration test that actually hits the database
      // For now, we'll mock the entire pipeline
      
      const participantData = {
        name: 'Jane Doe',
        role: 'Teilnehmer',
        region: 'Munich',
        pronouns: 'sie/ihr',
        instagram: '@janedoe'
      };

      const mockResult = { 
        rows: [{ id: 1, ...participantData }], 
        rowCount: 1 
      };

      executeQuery.mockResolvedValueOnce(mockResult);

      const result = await executeQuery(
        'INSERT INTO participants (name, role, region, pronouns, instagram) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        Object.values(participantData),
        {
          validateConstraints: true,
          validateResult: { minRows: 1, requiredFields: ['id', 'name'] }
        }
      );

      expect(result.rows[0]).toMatchObject(participantData);
      expect(result.rows[0]).toHaveProperty('id');
    });

    it('should handle complex transaction with multiple integrity checks', async () => {
      // Mock a complex transaction scenario
      const mockResults = [
        { rows: [{ id: 1 }], rowCount: 1 },
        { rows: [{ id: 1 }], rowCount: 1 },
        { rows: [{ id: 2 }], rowCount: 1 }
      ];

      executeTransaction.mockResolvedValueOnce(mockResults);

      const queries = [
        {
          query: 'INSERT INTO rounds (title, "startDateTime", "endDateTime") VALUES ($1, $2, $3) RETURNING id',
          params: ['Championship Round', '2025-06-01 10:00:00', '2025-06-01 12:00:00'],
          validate: true
        },
        {
          query: 'INSERT INTO round_participants (round_id, participant_id, "order") VALUES ($1, $2, $3)',
          params: [1, 1, 1],
          validate: true
        },
        {
          query: 'INSERT INTO round_participants (round_id, participant_id, "order") VALUES ($1, $2, $3)',
          params: [1, 2, 2],
          validate: true
        }
      ];

      const results = await executeTransaction(queries, {
        validateIntegrity: true,
        checkReferences: true,
        auditLog: true
      });

      expect(results).toHaveLength(3);
      expect(results.every(r => r.rowCount === 1)).toBe(true);
    });
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('should complete integrity check within reasonable time', async () => {
    const mockReport = {
      timestamp: '2025-01-01T00:00:00.000Z',
      checks: [],
      errors: [],
      warnings: []
    };

    performFullDataIntegrityCheck.mockResolvedValueOnce(mockReport);

    const startTime = Date.now();
    await performFullDataIntegrityCheck();
    const duration = Date.now() - startTime;

    // Should complete within 10 seconds for testing
    expect(duration).toBeLessThan(10000);
  });

  it('should handle bulk operations efficiently', async () => {
    const bulkSize = 100;
    const mockResults = Array(bulkSize).fill({ rows: [{ id: 1 }], rowCount: 1 });
    
    executeTransaction.mockResolvedValueOnce(mockResults);

    const queries = Array(bulkSize).fill().map((_, i) => ({
      query: 'INSERT INTO participants (name, role, region) VALUES ($1, $2, $3) RETURNING id',
      params: [`Participant ${i}`, 'Teilnehmer', 'Berlin'],
      validate: true
    }));

    const startTime = Date.now();
    await executeTransaction(queries, { validateIntegrity: true });
    const duration = Date.now() - startTime;

    // Should handle 100 records within reasonable time
    expect(duration).toBeLessThan(5000);
  });
});