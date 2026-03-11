import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { compare, hash } from 'bcryptjs';
import { Model } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User, UserDocument } from './schemas/user.schema';

type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const normalizedEmail = dto.email.toLowerCase();
    const existing = await this.userModel.findOne({ email: normalizedEmail }).exec();
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await hash(dto.password, 10);
    const user = await this.userModel.create({
      email: normalizedEmail,
      password: hashedPassword,
    });
    return this.createTokenPair(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const normalizedEmail = dto.email.toLowerCase();
    const user = await this.userModel.findOne({ email: normalizedEmail }).exec();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createTokenPair(user.id, user.email);
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userModel.findById(payload.sub).exec();
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const access_token = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    return { access_token };
  }

  async getMe(userId: string): Promise<{ email: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { email: user.email };
  }

  private async createTokenPair(userId: string, email: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { access_token, refresh_token };
  }
}
