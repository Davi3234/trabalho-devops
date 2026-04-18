import { Test, TestingModule } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppController } from '@presentation/controllers/app.controller'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController]
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('root', () => {
    it('deveria retornar `true`', () => {
      expect(appController.getHealth()).toBe(true)
    })
  })
})
