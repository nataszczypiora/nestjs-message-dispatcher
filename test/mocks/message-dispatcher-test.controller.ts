import { Controller, Get, Param } from '@nestjs/common';
import {
  Action,
  MessageEventEmitter,
} from '../../src/message-dispatcher.decorator';

@Controller('/test')
export class MessageDispatcherTestController {
  @MessageEventEmitter({
    objectIdGetter: (request) => request.params.id,
    action: Action.CREATED,
  })
  @Get(':id')
  async test(@Param() params: { id: string }): Promise<{ id: string }> {
    return { id: params.id };
  }
}
