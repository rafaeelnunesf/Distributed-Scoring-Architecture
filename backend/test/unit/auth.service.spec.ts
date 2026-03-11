import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { hash } from 'bcryptjs';
import { AuthService } from '../../src/auth/auth.service';
import { User } from '../../src/auth/schemas/user.schema';

type ExecResult<T> = { exec: () => Promise<T> };

function execResult<T>(value: T): ExecResult<T> {
  return {
    exec: async () => value,
  };
}

describe('AuthService', () => {
  let service: AuthService;

  const userModelMock = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_SECRET: 'jwt-secret-test-value',
        JWT_REFRESH_SECRET: 'refresh-secret-test-value',
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: userModelMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a user and returns access + refresh tokens', async () => {
    userModelMock.findOne.mockReturnValue(execResult(null));
    userModelMock.create.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
    });
    jwtServiceMock.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.register({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result).toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(userModelMock.create).toHaveBeenCalledTimes(1);
    expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(2);
  });

  it('logs in a user with valid credentials', async () => {
    const hashedPassword = await hash('password123', 10);
    userModelMock.findOne.mockReturnValue(
      execResult({
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        password: hashedPassword,
      }),
    );
    jwtServiceMock.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.access_token).toBe('access-token');
    expect(result.refresh_token).toBe('refresh-token');
  });

  it('refreshes access token from a valid refresh token', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
    });
    userModelMock.findById.mockReturnValue(
      execResult({
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      }),
    );
    jwtServiceMock.signAsync.mockResolvedValue('new-access-token');

    const result = await service.refresh('valid-refresh-token');

    expect(result).toEqual({ access_token: 'new-access-token' });
  });

  it('throws ConflictException when registering duplicated email', async () => {
    userModelMock.findOne.mockReturnValue(execResult({ id: 'existing-id' }));

    await expect(
      service.register({
        email: 'dup@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws UnauthorizedException for invalid login', async () => {
    userModelMock.findOne.mockReturnValue(execResult(null));

    await expect(
      service.login({
        email: 'unknown@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
