import { Types } from 'mongoose';
import { CarriersRepository } from '../../src/carriers/repositories/carriers.repository';

describe('CarriersRepository', () => {
  const carrierModelMock = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    bulkWrite: jest.fn(),
  };

  const historyModelMock = {
    insertMany: jest.fn(),
    find: jest.fn(),
  };

  let repository: CarriersRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CarriersRepository(
      carrierModelMock as never,
      historyModelMock as never,
    );
  });

  it('findWithFilters returns paginated records and nextCursor', async () => {
    const rows = [
      { _id: new Types.ObjectId(), dot_number: 'A1' },
      { _id: new Types.ObjectId(), dot_number: 'A2' },
      { _id: new Types.ObjectId(), dot_number: 'A3' },
    ];

    const execFind = jest.fn().mockResolvedValue(rows);
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: execFind,
    };

    carrierModelMock.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(99),
    });
    carrierModelMock.find.mockReturnValue(findChain);

    const result = await repository.findWithFilters(
      { minScore: 10, authorityStatus: 'ACTIVE' },
      undefined,
      2,
    );

    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(result.data[1]._id.toString());
    expect(result.total).toBe(99);
  });

  it('upsertMany issues bulk upsert operations', async () => {
    carrierModelMock.bulkWrite.mockResolvedValue({});

    await repository.upsertMany([
      {
        dot_number: '123',
        legal_name: 'Carrier A',
        total_score: 80,
        tier: 'SAFE',
        breakdown: {
          safety_rating: 80,
          oos_pct: 90,
          crash_total: 70,
          driver_oos: 85,
          insurance: 88,
          authority: 95,
        },
        content_hash: 'hash-123',
        authority_status: 'ACTIVE',
        raw_data: { dot_number: '123' },
        lastUpdatedAt: new Date(),
      },
    ]);

    expect(carrierModelMock.bulkWrite).toHaveBeenCalledTimes(1);
    const [operations] = carrierModelMock.bulkWrite.mock.calls[0];
    expect(Array.isArray(operations)).toBe(true);
    expect(operations[0].updateOne.upsert).toBe(true);
  });

  it('findByDotNumbers performs batch lookup', async () => {
    carrierModelMock.find.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ dot_number: '111' }]),
    });

    const result = await repository.findByDotNumbers(['111', '222']);

    expect(carrierModelMock.find).toHaveBeenCalledWith({
      dot_number: { $in: ['111', '222'] },
    });
    expect(result).toHaveLength(1);
  });
});
