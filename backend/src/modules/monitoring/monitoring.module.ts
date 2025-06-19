import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitoringController } from './controllers/monitoring.controller';
import { MonitoringService } from './services/monitoring.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { LoadBalancerService } from './services/load-balancer.service';
import { JobTracking, JobTrackingSchema } from './schemas/job-tracking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobTracking.name, schema: JobTrackingSchema },
    ]),
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    CircuitBreakerService,
    LoadBalancerService,
  ],
  exports: [
    MonitoringService,
    CircuitBreakerService,
    LoadBalancerService,
  ],
})
export class MonitoringModule {} 