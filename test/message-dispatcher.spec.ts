import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import {
  AsyncLoggerProvider,
  MessageDispatcherInterceptor,
} from '../src/message-dispatcher.interceptor';
import {
  Message,
  MsgActionType,
  MsgObjectType,
  MsgServiceType,
} from '../src/message.dto';
import { Options } from '../src/options.dto';
import { LoggerService } from './mocks/logger.service';
import { MessageDispatcherTestController } from './mocks/message-dispatcher-test.controller';

describe('Message Dispatcher', () => {
  let app: INestApplication;
  let transport: AsyncLoggerProvider;
  const subject = 'mutation.test';
  const serviceId = 'test.service.id';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MessageDispatcherTestController],
      providers: [
        LoggerService,
        MessageDispatcherInterceptor,
        {
          provide: AsyncLoggerProvider,
          useExisting: LoggerService,
        },
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

    transport = app.get<AsyncLoggerProvider>(AsyncLoggerProvider);
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
        timestamp: expect.anything(),
      });
    });
  });
});
