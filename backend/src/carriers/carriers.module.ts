import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Carrier,
  CarrierSchema,
} from './schemas/carrier.schema';
import {
  CarrierHistory,
  CarrierHistorySchema,
} from './schemas/carrier-history.schema';
import { CarriersRepository } from './repositories/carriers.repository';
import { CarriersService } from './carriers.service';
import { CarriersController } from './carriers.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Carrier.name, schema: CarrierSchema },
      { name: CarrierHistory.name, schema: CarrierHistorySchema },
    ]),
  ],
  providers: [CarriersRepository, CarriersService],
  controllers: [CarriersController],
  exports: [CarriersRepository, CarriersService],
})
export class CarriersModule { }
