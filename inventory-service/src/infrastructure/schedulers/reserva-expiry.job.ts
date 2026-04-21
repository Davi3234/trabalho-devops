import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { ExpirarReservasUseCase } from '@application/use-cases/expirar-reserva.use-case'

@Injectable()
export class ReservaExpiryJob {

  private readonly logger = new Logger(ReservaExpiryJob.name)

  private isRunning = false

  constructor(
    private readonly expirarReservas: ExpirarReservasUseCase
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async executar(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Job de expiração ainda em execução. Pulando ciclo.')
      return
    }

    this.isRunning = true

    try {
      const { expiradas } = await this.expirarReservas.execute()

      if (expiradas > 0) {
        this.logger.log(`Job de expiração concluído: ${expiradas} reserva(s) expirada(s)`)
      }
    } catch (err) {
      this.logger.error(`Erro no job de expiração: ${(err as Error).message}`, (err as Error).stack)
    } finally {
      this.isRunning = false
    }
  }
}
