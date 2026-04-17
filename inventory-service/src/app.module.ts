import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

import { AppController } from '@presentation/controllers/app.controller'
import { CatchAllExceptionFilter } from '@presentation/filters/catch-all.filter'

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: CatchAllExceptionFilter
    }
  ],
})
export class AppModule { }
