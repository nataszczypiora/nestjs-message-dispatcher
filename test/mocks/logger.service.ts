import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
  async log(pattern: string, data: Record<string, unknown>) {}
}
