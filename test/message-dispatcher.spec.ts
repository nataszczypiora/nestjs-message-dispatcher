import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  Module,
  Param,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import {
  Action,
  MessageEventEmitter,
} from '../src/message-dispatcher.decorator';
import { MessageDispatcherInterceptor } from '../src/message-dispatcher.interceptor';
import {
  Message,
  MsgActionType,
  MsgObjectType,
  MsgServiceType,
} from '../src/message.dto';
import { Options } from '../src/options.dto';

const timeString = '2022-01-01T01:01:01.401';

jest.useFakeTimers().setSystemTime(new Date(`${timeString}Z`).getTime());

@Injectable()
class NatsClientService {
  async log(pattern: string, data: Record<string, unknown>) {}
}

@Module({
  providers: [NatsClientService],
  exports: [NatsClientService],
})
class NatsClientModule {}

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

describe('Message Dispatcher', () => {
  let app: INestApplication;
  let transport: NatsClientService;
  const subject = 'mutation.test';
  const serviceId = 'test.service.id';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [NatsClientModule],
      controllers: [MessageDispatcherTestController],
      providers: [
        NatsClientService,
        MessageDispatcherInterceptor,
        {
          provide: Options,
          useValue: <Options>{
            subject,
            messageData: <Partial<Message>>{
              service: {
                type: MsgServiceType.App,
                id: serviceId,
              },
              action: {
                type: MsgActionType.Object,
              },
              object: {
                type: MsgObjectType.ErudioNamespace,
              },
            },
          },
        },
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    transport = app.get<NatsClientService>(NatsClientService);
  });

  describe('interceptor', () => {
    it('should create and send message', async () => {
      jest.spyOn(transport, 'log');
      const id = '123-test';

      await request(app.getHttpServer()).get(`/test/${id}`).expect(200);

      expect(transport.log).toHaveBeenCalledTimes(1);
      expect(transport.log).toHaveBeenCalledWith(subject, {
        action: { type: 'urn:forlagshuset:action:object', verb: 'created' },
        object: {
          id,
          type: 'urn:forlagshuset:object:erudio:namespace',
        },
        payload: { id },
        service: {
          id: serviceId,
          type: 'urn:forlagshuset:service:app',
        },
        timestamp: `${timeString}000Z`,
      });
    });
  });
});
